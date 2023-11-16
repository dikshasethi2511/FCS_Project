from service_providers import *
from all_imports import *
from generate_pki import *
from generate_jwt import *
from helper_functions import *
import requests

request_count = {}

limit = 100
window_minutes = 1

@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    ip = request.client.host  
    port = request.client.port

    if f'{ip}:{port}' in request_count:
        if datetime.now() - request_count[f'{ip}:{port}']["timestamp"] < timedelta(minutes=window_minutes):
            if request_count[f'{ip}:{port}']["count"] >= limit:
                raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Try again later.")
            else:
                request_count[f'{ip}:{port}']["count"] += 1
        else:
            request_count[f'{ip}:{port}'] = {"count": 1, "timestamp": datetime.now()}
    else:
        request_count[f'{ip}:{port}'] = {"count": 1, "timestamp": datetime.now()}

    response = await call_next(request)
    return response

add_money_timer = {
    "is_running": False,
    "start_time": None,
    "duration": 0,
}

ADMIN_WALLET = "7583173889845428"

@app.get("/api/get-pki")
async def getKeyPair():
    bits = 512
    p = generate_prime(bits)
    q = generate_prime(bits)
    while p == q:
        q = generate_prime(bits)

    n = p * q
    phi = (p - 1) * (q - 1)

    e = random.randint(65537, phi - 1)
    while math.gcd(e, phi) != 1:
        e = random.randint(65537, phi - 1)

    d = mod_inverse(e, phi)
    n_bytes = n.to_bytes((n.bit_length() + 7) // 8, byteorder='big')
    e_bytes = e.to_bytes((e.bit_length() + 7) // 8, byteorder='big')

    public_key_struct = struct.pack('!B', 0x02) + n_bytes + e_bytes
    private_key_struct = struct.pack(
        '!B', 0x02) + n_bytes + e_bytes + d.to_bytes((d.bit_length() + 7) // 8, byteorder='big')

    public_pem = (
        "-----BEGIN PUBLIC KEY-----\n" +
        b64encode(public_key_struct).decode('ascii') +
        "\n-----END PUBLIC KEY-----"
    )

    private_pem = (
        "-----BEGIN RSA PRIVATE KEY-----\n" +
        b64encode(private_key_struct).decode('ascii') +
        "\n-----END RSA PRIVATE KEY-----"
    )
    return convert_dict_to_json({"public_key_pem": public_pem, "private_key_pem": private_pem})


@app.post("/api/user-login", response_model=Token)
async def login_for_access(form_data: OAuth2PasswordRequestForm = Depends()):
    user_data = db.users.find_one({"email": form_data.username})
    if user_data and user_data.get("password") == form_data.password:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data.get("email")}, expires_delta=access_token_expires)
        return {"access_token": access_token, "token_type": "bearer"}
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})


@app.post("/api/admin-delete-property")
async def admin_delete_property(packet: AdminDeleteProperty, current_user: basicUserDetails = Depends(get_current_active_user)):

    if packet.adminEmail not in admin_emails:
        raise HTTPException(
            status_code=404, detail="You are not the admin!")
    
    if current_user.email != packet.adminEmail:
        raise HTTPException(
            status_code=401, detail="Email not matching")

    user_data = db.users.find_one({"email": packet.adminEmail})
    if user_data.get("password") != packet.adminPassword:
        raise HTTPException(
            status_code=404, detail="You are not the admin!")

    # ADD CHECKS ON ALL OPERATIONS
    property_data = db.properties.find_one({"id": packet.propertyId})
    property_owner = property_data["owner_email"]
    property_documents = property_data["property_documents"]

    query = {'email': property_owner}
    update = {'$pull': {'properties': packet.propertyId}}
    result = db.users.update_one(query, update)

    for document_id in property_documents:
        await deletePropertyDocuments(DocumentIdentity(document_id=document_id), current_user)

    result = db.reports.delete_many(
        {"typeReport": 'Property', "reported": packet.propertyId})
    result = db.contracts.delete_many({"id": packet.propertyId, "amount_paid": 0})

    result = db.properties.delete_one({"id": packet.propertyId})
    if result.acknowledged:
        return {"message": "Property deleted successfully"}
    else:
        raise HTTPException(
            status_code=404, detail="Could not find property")


@app.post("/api/admin-delete-user")
async def admin_delete_user(packet: DeleteUser, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != packet.adminEmail:
        raise HTTPException(
            status_code=401, detail="Email not matching")
    
    if packet.adminEmail not in admin_emails:
        raise HTTPException(
            status_code=404, detail="You are not the admin!")
    else:
        user_data = db.users.find_one({"email": packet.adminEmail})
        if user_data.get("password") != packet.adminPassword:
            raise HTTPException(
                status_code=404, detail="You are not the admin2!")
    if (packet.adminEmail == packet.toBeDeletedEmail):
        return {"message": f"You cannot delete admins"}

    toBeDeletedUser = db.users.find_one({"email": packet.toBeDeletedEmail})
    db.wallets.delete_many(
        {"wallet_id": toBeDeletedUser["wallet_id"]})
    db.reports.delete_many(
        {"$or": [{"reported_by": packet.toBeDeletedEmail}, {"reported": packet.toBeDeletedEmail}]})

    propertiesOfUser = db.properties.find({"owner_email": packet.toBeDeletedEmail})
    for propertyOfUser in propertiesOfUser:
        await admin_delete_property(AdminDeleteProperty(adminEmail=packet.adminEmail, adminPassword=packet.adminPassword, propertyId=propertyOfUser["id"]), current_user)

    db.contracts.delete_many(
        {"$or": [{"buyer_email": packet.toBeDeletedEmail, "amount_paid": 0}, 
                 {"seller_email": packet.toBeDeletedEmail, "amount_paid": 0}]})

    result = db.users.delete_one({"email": packet.toBeDeletedEmail})


@app.post("/api/user-register")
async def signup(name: str = Form(...), email: str = Form(...), password: str = Form(...), aadhar_file: UploadFile = File(...), publicKey: str = Form(...), vc_inp: str = Form(...), vc_actual: str = Form(...), ekyc_password: str = Form(...), wallet_id: str = Form(...)):

    external_api_data = {
        "email": email,
        "password": ekyc_password
    }

    external_api_url = "https://192.168.3.39:5000/kyc"
    response = requests.post(
        external_api_url, json=external_api_data, verify=False)
    if response.status_code == 200:
        response_data = response.json()
        if "message" in response_data and "status" in response_data:
            if response_data["status"] == "error":
                raise HTTPException(
                    status_code=401, detail="Invalid E-KYC credentials")
    else:
        raise HTTPException(
            status_code=404, detail="E-Kyc no response") 

    file_contents = await aadhar_file.read()
    aadhar_nparr = np.frombuffer(file_contents, np.uint8)
    aadhar_img_np = cv2.imdecode(aadhar_nparr, cv2.IMREAD_COLOR)
    aadhar_text = pytesseract.image_to_string(aadhar_img_np)

    if name.lower() in aadhar_text.lower():
        if vc_inp != vc_actual:
            raise HTTPException(
                status_code=401, detail="Verification code did not match")

        existing_wallet = db.wallets.find_one({"wallet_id": wallet_id})
        if not existing_wallet:
            raise HTTPException(
                status_code=401, detail="Wallet doesn't exist, couldn't create user!")

        userinfo = {
            "name": name,
            "email": email,
            "password": password,
            "publicKey": publicKey,
            "wallet_id": wallet_id,
            "properties": []
        }
        result = db.users.insert_one(userinfo)

        if result.acknowledged:
            return {"message": "User created successfully", "user_id": str(result.inserted_id)}
        raise HTTPException(
            status_code=401, detail="User could not be added to the database")
    else:
        raise HTTPException(
            status_code=401, detail="Aadhar could not be verified")


@app.post("/api/user-profile")
async def getUserDetails(emailDetails: EmailDetails, current_user: basicUserDetails = Depends(get_current_active_user)):
    if current_user.email != emailDetails.email:
        raise HTTPException(
            status_code=401, detail="Email not matching")
    
    user_data = db.users.find_one({"email": emailDetails.email})
    if user_data:
        return convert_dict_to_json(user_data)
    else:
        raise HTTPException(
            status_code=401, detail="Could not find user in the database")


@app.post("/api/add-money-to-wallet")
async def addMoneyToWallet(wallet: Wallet, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != wallet.doer_email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    doer_data = db.users.find_one({"email": wallet.doer_email})
    wallet_exists = db.wallets.find_one({"wallet_id": wallet.wallet_id})

    if doer_data["wallet_id"] != wallet.wallet_id:
        raise HTTPException(
            status_code=401, detail="Not your wallet")
    
    if wallet_exists:
        available_credits = wallet_exists["credits"]
        transaction_document = {
            "source": "EXTERNAL_SOURCE",
            "wallet_id": wallet.wallet_id,
            "amount": 500,
            "timestamp": datetime.utcnow()
        }
        new_credits = available_credits + 500
        db.wallets.update_one(
            {"wallet_id": wallet.wallet_id},
            {"$set": {"credits": new_credits}}
        )
        result = db.transactions.insert_one(transaction_document)
        if result.acknowledged:
            return {"message": "500 credits added to wallet!"}
        else:
            raise HTTPException(
                status_code=401, detail="Could not credit money to wallet")
    else:
        raise HTTPException(
            status_code=401, detail="Could not find wallet")


@app.post("/api/can-add-money-to-wallet")
async def canAddMoney(wallet: Wallet, current_user: basicUserDetails = Depends(get_current_active_user)):
    if current_user.email != wallet.doer_email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    doer_data = db.users.find_one({"email": wallet.doer_email})
    wallet_exists = db.wallets.find_one({"wallet_id": wallet.wallet_id})

    if doer_data["wallet_id"] != wallet.wallet_id:
        raise HTTPException(
            status_code=401, detail="Not your wallet")
    
    transactions = db.transactions.find(
        {"wallet_id": wallet.wallet_id, "source": "EXTERNAL_SOURCE"})
    current_time = datetime.utcnow()
    canAddMoney = True

    latest_transaction_time = None

    # Find the latest transaction timestamp
    for transaction in transactions:
        # Assuming there is a "timestamp" field in your transaction documents
        transaction_time = transaction["timestamp"]

        if latest_transaction_time is None or transaction_time > latest_transaction_time:
            latest_transaction_time = transaction_time

    if latest_transaction_time is not None:
        time_difference = current_time - latest_transaction_time

        # Check if the time difference is more than 2 hours (7200 seconds)
        if time_difference.total_seconds() < 7200:
            canAddMoney = False

    if canAddMoney:
        return {"message": "Can add money to wallet"}
    else:
        raise HTTPException(
            status_code=401, detail="Time limit exhausted to add money")


def sendMoneyToUser(seller_email: str, amount: str):
    userExists = db.users.find_one({"email": seller_email})
    walletID = None
    if (userExists):
        walletID = userExists["wallet_id"]
    adminWallet = db.wallets.find_one({"wallet_id": ADMIN_WALLET})
    userWallet = db.wallets.find_one({"wallet_id": walletID})
    if (userWallet):
        if (adminWallet["credits"] >= int(amount)):
            newAmountAdmin = adminWallet["credits"]-int(amount)
            db.wallets.update_one(
                {"wallet_id": ADMIN_WALLET},
                {"$set": {"credits": newAmountAdmin}}
            )
            newAmountUser = userWallet["credits"]+int(amount)
            db.wallets.update_one(
                {"wallet_id": walletID},
                {"$set": {"credits": newAmountUser}}
            )
            transaction_document = {
                "source": adminWallet["wallet_id"],
                "wallet_id": userWallet["wallet_id"],
                "amount": amount,
                "timestamp": datetime.utcnow()
            }
            result = db.transactions.insert_one(transaction_document)
            if result.acknowledged:
                return True
            else:
                return False
        else:
            return False
    else:
        return False


@app.post("/api/send-money-to-portal")
async def sendMoneyToPortal(transferInfo: TransferFund, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != transferInfo.doer_email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    doer_data = db.users.find_one({"email": transferInfo.doer_email})
    wallet_exists = db.wallets.find_one(
        {"wallet_id": transferInfo.wallet_id})
    if wallet_exists is None:
        raise HTTPException(
            status_code=401, detail="Could not find wallet")
    
    if doer_data["wallet_id"] != transferInfo.wallet_id:
        raise HTTPException(
            status_code=401, detail="Not your wallet id")
    
    # Finding the corresponding contract details.
    transactionAmount = 0
    contract_exists = db.contracts.find_one({"id": transferInfo.contract_id})
    if (contract_exists is None):
        raise HTTPException(
            status_code=401, detail="Contract does not exist")

    property_data = db.properties.find_one(
        {"id": contract_exists["property_id"]})
    if not property_data:
        raise HTTPException(
            status_code=401, detail="Could not find corresponding property")

    for_sale = property_data["for_sale"]

    hashed_wallet_password = hashlib.sha256(
        transferInfo.wallet_pin.encode()).hexdigest()

    # Checking if the wallet exists and the pin matches.
    if (wallet_exists and wallet_exists["hashed_wallet_password"] == hashed_wallet_password):
        # Checks if the wallet has sufficient balance to pay the specified amount.
        if (wallet_exists["credits"] >= int(transferInfo.amount)):
            specifiedAmount = int(transferInfo.amount)
            valueMatched = False
            if (specifiedAmount >= int(contract_exists["property_value"]) - int(contract_exists["amount_paid"])):
                # If the user has specified the greater amount, we just transact the leftover amount.
                transactionAmount = int(
                    contract_exists["property_value"]) - int(contract_exists["amount_paid"])
                valueMatched = True
            else:
                transactionAmount = specifiedAmount

            if (not for_sale and specifiedAmount < int(contract_exists["property_value"])):
                raise HTTPException(
                    status_code=401, detail="Payment for renting properties cannot be done through installments")

            # Update the buyer's wallet amount.
            newAmountUser = wallet_exists["credits"] - transactionAmount
            db.wallets.update_one(
                {"wallet_id": transferInfo.wallet_id},
                {"$set": {"credits": newAmountUser}}
            )
            adminWallet = db.wallets.find_one({"wallet_id": ADMIN_WALLET})
            newAmountAdmin = adminWallet["credits"] + int(transactionAmount)
            db.wallets.update_one(
                {"wallet_id": ADMIN_WALLET},
                {"$set": {"credits": newAmountAdmin}}
            )
            newAmountContract = contract_exists["amount_paid"] + \
                int(transactionAmount)
            db.contracts.update_one(
                {"id": transferInfo.contract_id},
                {"$set": {"amount_paid": newAmountContract}}
            )

            if valueMatched:
                if property_data:
                    property_id = property_data["id"]
                    db.properties.delete_one({"id": property_id})
                    property_structure = {
                        "id": str(uuid.uuid4()),
                        "name": property_data["name"],
                        "owner_email": contract_exists["buyer_email"],
                        "for_sale": property_data["for_sale"],
                        "price": property_data["price"],
                        "location": property_data["location"],
                        "amenities": property_data["amenities"],
                        "start_date": property_data["start_date"],
                        "end_date": property_data["end_date"],
                        "view_listing": False,
                        "is_sold": False,
                        "is_admin_verified": False,
                        "property_documents": []
                    }
                    property_documents = property_data["property_documents"]

                    db.properties.insert_one(property_structure)
                    db.reports.delete_one({"reported": property_id})
                    db.users.update_one({"email":  contract_exists["seller_email"]}, {
                                        "$pull": {"properties": property_id}})
                    db.users.update_one({"email":  contract_exists["buyer_email"]}, {
                                        "$push": {"properties": property_data["id"]}})
                    for document in property_documents:
                        db.documents.delete_one({"id": document})

                else:
                    raise HTTPException(
                        status_code=401, detail="Could not find property in the database")

            # TO DO: IF valueMatched TRUE whatever transfer of
            # property that needs to be done in case the property
            # is of type buy

            # Note: since I am updating the amount automatically if the user gives
            # more money than reqd here it will work fine in this api but if
            # same needs to be done in send-money-to-user and uske liye will also need contract details

            transaction_document = {
                "source": transferInfo.wallet_id,
                "wallet_id": adminWallet["wallet_id"],
                "amount": str(transactionAmount),
                "timestamp": datetime.utcnow()
            }
            result = db.transactions.insert_one(transaction_document)
            seller_email = contract_exists["seller_email"]
            userExists = db.users.find_one({"email": seller_email})
            walletID = None
            if (userExists):
                walletID = userExists["wallet_id"]
            adminWallet = db.wallets.find_one({"wallet_id": ADMIN_WALLET})
            userWallet = db.wallets.find_one({"wallet_id": walletID})
            if (userWallet):
                if (adminWallet["credits"] >= int(transactionAmount)):
                    newAmountAdmin = adminWallet["credits"] - \
                        int(transactionAmount)
                    db.wallets.update_one(
                        {"wallet_id": ADMIN_WALLET},
                        {"$set": {"credits": newAmountAdmin}}
                    )
                    newAmountUser = userWallet["credits"] + \
                        int(transactionAmount)
                    db.wallets.update_one(
                        {"wallet_id": walletID},
                        {"$set": {"credits": newAmountUser}}
                    )
                    transaction_document = {
                        "source": adminWallet["wallet_id"],
                        "wallet_id": userWallet["wallet_id"],
                        "amount": transactionAmount,
                        "timestamp": datetime.utcnow()
                    }
                    isMoneySent = db.transactions.insert_one(
                        transaction_document)
            if result.acknowledged and isMoneySent:
                return {"message": "Successfully transferred the amount from buyer to seller via Portal"}
            else:
                raise HTTPException(
                    status_code=401, detail="Couldn't log transaction")
        else:
            raise HTTPException(
                status_code=401, detail="Not enough funds")
    else:
        raise HTTPException(
            status_code=401, detail="Wallet does not exist")


@app.post("/api/transfer-funds")
async def propertyFundTransaction(transaction_info: Transaction, current_user: basicUserDetails = Depends(get_current_active_user)):
    owner_wallet_exists = db.wallets.find_one(
        {"wallet_id": transaction_info.owner_wallet_id})
    buyer_wallet_exists = db.wallets.find_one(
        {"wallet_id": transaction_info.buyer_wallet_id_wallet_id})
    if owner_wallet_exists and buyer_wallet_exists:
        buyer_available_credits = buyer_wallet_exists["credits"]
        if buyer_available_credits >= transaction_info.amount:
            transaction_document = {
                "source": transaction_info.buyer_wallet_id,
                "wallet_id": transaction_info.owner_wallet_id,
                "amount": transaction_info.amount
            }
            buyer_new_credits = buyer_available_credits - transaction_info.amount
            db.wallets.update_one(
                {"wallet_id": transaction_info.buyer_wallet_id},
                {"$set": {"credits": buyer_new_credits}}
            )
            owner_new_credits = owner_wallet_exists["credits"] + \
                transaction_info.amount
            db.wallets.update_one(
                {"wallet_id": transaction_info.owner_wallet_id},
                {"$set": {"credits": owner_new_credits}}
            )
            result = db.transactions.insert_one(transaction_document)
            if result.acknowledged:
                return {"message": "500 credits added to wallet!"}
            else:
                raise HTTPException(
                    status_code=401, detail="Could not credit money to wallet")
        else:
            raise HTTPException(
                status_code=401, detail="Not enough Funds")
    else:
        raise HTTPException(
            status_code=401, detail="Could not find wallet")


@app.get("/api/getAddMoneyTimerStatus", response_model=TimerStatus)
def get_add_money_timer_status():
    if add_money_timer["is_running"]:
        start_time = add_money_timer["start_time"]
        duration = add_money_timer["duration"]
        elapsed_time = (datetime.now() - start_time).total_seconds()
        time_remaining = int(max(0, duration - elapsed_time))
        return TimerStatus(is_running=True, time_remaining=time_remaining)
    else:
        return TimerStatus(is_running=False, time_remaining=0)


@app.post("/api/view-transaction")
def getTransactions(verifyAdmin: basicUserDetails, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != verifyAdmin.email:
        raise HTTPException(
            status_code=401, detail="Email not matching")

    if verifyAdmin.email not in admin_emails:
        raise HTTPException(
            status_code=404, detail="You are not the admin!")
    else:
        user_data = db.users.find_one({"email": verifyAdmin.email})
        if user_data.get("password") != verifyAdmin.password:
            raise HTTPException(
                status_code=404, detail="You are not the admin!")

    transactions = db.transactions.find({}, {"_id": 0})
    transcation_list = []
    for transaction in transactions:
        transcation_list.append(transaction)

    return jsonable_encoder(transcation_list)


@app.post("/api/startAddMoneyTimer")
def start_add_money_timer(duration: Duration):
    if not add_money_timer["is_running"]:
        add_money_timer["is_running"] = True
        add_money_timer["start_time"] = datetime.now()
        add_money_timer["duration"] = duration.duration
    return {"message": "Add Money timer started successfully."}


@app.post("/api/report")
async def reportEntity(reportDetail: ReportDetails, current_user: basicUserDetails = Depends(get_current_active_user)):
    if current_user.email != reportDetail.report_by:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    # check if that entity exists first
    if reportDetail.type_report == "Property":
        result = db.properties.find_one({"id": reportDetail.reported})
    elif reportDetail.type_report == "User":  
         result = db.users.find_one({"email": reportDetail.reported})
    else:
        result == None
    
    if not result:
        raise HTTPException(
            status_code=404, detail="Type does not exist")

    reportStructure = {
        "reported_by": reportDetail.report_by,
        "reported": reportDetail.reported,
        "typeReport": reportDetail.type_report
    }
    reportInvalid = db.reports.find_one(reportStructure)
    if (reportInvalid is None):
        db.reports.insert_one(reportStructure)
        return {"message": "reported successfully"}
    return {"message": "You have already reported once"}


@app.get("/api/generate-wallet")
async def generateWallet():
    wallet_id = ''.join(str(random.randint(0, 9)) for _ in range(16))
    wallet_password = str(random.randint(10000, 99999))
    hashed_wallet_password = hashlib.sha256(
        wallet_password.encode()).hexdigest()
    credits = 2000

    wallet_data = {
        "wallet_id": wallet_id,
        "hashed_wallet_password": hashed_wallet_password,
        "credits": credits
    }

    result = db.wallets.insert_one(wallet_data)

    if result.acknowledged:
        return convert_dict_to_json({"wallet_id": wallet_id, "wallet_password": wallet_password})
    else:
        raise HTTPException(
            status_code=404, detail="Could not generate wallet")


@app.post("/api/view-balance")
async def viewBalance(wallet: Wallet, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != wallet.doer_email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    doer_data = db.users.find_one({"email": wallet.doer_email})
    wallet_exists = db.wallets.find_one({"wallet_id": wallet.wallet_id})

    if doer_data["wallet_id"] != wallet.wallet_id:
        raise HTTPException(
            status_code=401, detail="Not your wallet")
    
    if wallet_exists:
        available_credits = wallet_exists["credits"]
        return convert_dict_to_json({"credits": available_credits})
    else:
        raise HTTPException(
            status_code=401, detail="Could not find wallet")


@app.post("/api/add-property-documents")
async def addPropertyDocument(doer_email: str = Form(...), property_id: str = Form(...), user_private_key: str = Form(...), document: UploadFile = File(...), current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != doer_email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    

    document_contents = await document.read()
    storage_id = fs_documents.put(
        document_contents, filename=document.filename)
    document_id = str(uuid.uuid4())
    document_hash = hashlib.sha256(
        base64.b64encode(document_contents)).hexdigest()

    user_signature = encode(user_private_key, document_hash)

    if user_signature == "IncorrectQZYMP":
        raise HTTPException(
            status_code=401, detail="Invalid Private Key format")

    property_data = db.properties.find_one({"id": property_id})
    user_info = db.users.find_one({"email": property_data["owner_email"]})

    decoded_signature = decode(user_info["publicKey"], user_signature)
    if decoded_signature == "IncorrectQZYMP":
        raise HTTPException(
            status_code=401, detail="Invalid Public Key format")

    if document_hash == decoded_signature:
        document_structure = {
            "id": document_id,
            "storage_id": storage_id,
            "property_id": property_id,
            "name": document.filename,
            "hash": document_hash,
            "signature": user_signature,
            "is_verified": False
        }

        if property_data:
            query = {"id": property_id}
            update = {'$push': {'property_documents': document_id}}
            result = db.properties.update_one(query, update)

        result = db.documents.insert_one(document_structure)
        if result.acknowledged:
            return convert_dict_to_json({"message": "Property document added successfully", "document_id": str(result.inserted_id)})
        return convert_dict_to_json({"message": "Document could not be added to database"})
    else:
        raise HTTPException(
            status_code=401, detail="Signature could not be verified")


@app.post("/api/delete-property-documents")
async def deletePropertyDocuments(deleteInfo: DocumentIdentity, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != deleteInfo.doer_email:
        raise HTTPException(
            status_code=401, detail="Email not matching")

    document_data = db.documents.find_one({"id": deleteInfo.document_id})
    if current_user.email in admin_emails:
        query = {'id': document_data["property_id"]}
        update = {'$pull': {'property_documents': deleteInfo.document_id}}
        result = db.properties.update_one(query, update)
        result = db.documents.delete_one({"id": deleteInfo.document_id})
        if result.acknowledged:
            return {"message": "Document deleted successfully"}
        raise HTTPException(
            status_code=401, detail="Document could not be deleted")
    else:
        query = {'id': document_data["property_id"], "owner_email": current_user.email}
        update = {'$pull': {'property_documents': deleteInfo.document_id}}
        result = db.properties.update_one(query, update)
        result = db.documents.delete_one({"id": deleteInfo.document_id})
        if result.acknowledged:
            return {"message": "Document deleted successfully"}
        raise HTTPException(
            status_code=401, detail="Document could not be deleted")


@app.post("/api/search-property-documents")
async def searchPropertyDocuments(searchInfo: ModifyDocument, current_user: basicUserDetails = Depends(get_current_active_user)):

    document_data = db.documents.find_one(
        {"property_id": searchInfo.property_id, "name": searchInfo.document_identifier})
    if document_data:
        return convert_dict_to_json({"document_id": document_data["id"]})
    else:
        raise HTTPException(
            status_code=401, detail="Could not find document in the database")


@app.post("/api/get-all-property-documents")
async def getAllPropertyDocuments(property: IdentifyProperty, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != property.doer_email:
        raise HTTPException(
            status_code=401, detail="Email not matching")

    all_documents_data = db.documents.find(
        {"property_id": property.propertyId})
    
    if current_user.email not in admin_emails:
        result = db.properties.find_one({"id": property.propertyId})
        if result["owner_email"] != current_user.email:
            raise HTTPException(
            status_code=401, detail="Not your property")

    if all_documents_data:
        documents = []
        for entity in all_documents_data:
            entity_dict = {}
            for key, value in entity.items():
                if key != "_id":
                    entity_dict[key] = str(value)
                if key == "storage_id":
                    storage_id = value
                    document = fs_documents.get(storage_id)
                    entity_dict['name'] = str(document.filename)
                    entity_dict['content'] = base64.b64encode(
                        document.read()).decode()

            documents.append(entity_dict)
        return Response(content=json.dumps({"all_documents": documents}), media_type="application/json")
    else:
        raise HTTPException(
            status_code=401, detail="Could not find documents in the database")


@app.post("/api/add-user-property")
async def addUserProperty(name: str = Form(...),  email: str = Form(...), price: str = Form(...), for_sale: str = Form(...), location: str = Form(...), amenities: str = Form(None), start_date: str = Form(None), end_date: str = Form(None), current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != email:
        raise HTTPException(
            status_code=401, detail="")

    if not is_valid_number(price):
        raise HTTPException(
            status_code=401, detail="Enter a price between 1 and 3000")
    
    if not for_sale:
        if not is_valid_date(start_date) or not is_valid_date(end_date):
            raise HTTPException(
                status_code=401, detail="Invalid date!")
        
        if not is_end_date_greater(start_date, end_date):
            raise HTTPException(
                status_code=401, detail="End date should be atleast one month greater")

    
    property_id = str(uuid.uuid4())
    type = False
    if (for_sale != 'Rent'):
        type = True

    property_structure = {
        "id": property_id,
        "name": name,
        "owner_email": email,
        "for_sale": type,
        "price": price,
        "location": location,
        "amenities": amenities if amenities is not None else "",
        "start_date": start_date if start_date is not None else "",
        "end_date": end_date if end_date is not None else "",
        "view_listing": True,
        "is_sold": False,
        "is_admin_verified": False,
        "property_documents": []
    }

    user_data = db.users.find_one({"email": email})
    if user_data:
        query = {'email': user_data['email']}
        update = {'$push': {'properties': property_id}}
        result = db.users.update_one(query, update)
    else:
        raise HTTPException(
            status_code=401, detail="Can not find user to associate with property")


    result = db.properties.insert_one(property_structure)
    if result.acknowledged:
        return {"message": "Property added successfully", "property_id": str(result.inserted_id)}
    raise HTTPException(
            status_code=401, detail="Could not add property")


@app.post("/api/search-user-property")
async def searchUserProperty(searchProperty: SearchProperty, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != searchProperty.doer_email:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    property_name = searchProperty.name
    owner_email = searchProperty.owner_email

    property_data = db.properties.find_one(
        {"owner_email": owner_email, "name": property_name})

    if property_data:
        return {"property_id": property_data["id"], "for_sale": property_data["for_sale"]}
    else:
        raise HTTPException(
            status_code=401, detail="Could not find property in the database")


@app.post("/api/get-all-user-properties")
async def getAllUserProperties(owner_email: EmailDetails, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != owner_email.email:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    property_data = db.properties.find(
        {"owner_email": owner_email.email})

    if property_data:
        properties = []
        for entity in property_data:
            entity_dict = {}
            for key, value in entity.items():
                if key != "_id":
                    entity_dict[key] = str(value)
            properties.append(entity_dict)
        return convert_dict_to_json({"all_properties": properties})
    else:
        raise HTTPException(
            status_code=401, detail="Could not find property in the database")


@app.post("/api/admin-verify-all-property-documents")
async def adminVerifyAllPropertyDocuments(property_id: IdentifyProperty, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != property_id.doer_email:
        raise HTTPException(
            status_code=401, detail="Email not matching")
    
    property_info = db.properties.find_one({"id": property_id.propertyId})
    
    if property_info:
        # Update the property document to set is_admin_verified to True
        db.properties.update_many({"id": property_id.propertyId}, {
                                  "$set": {"is_admin_verified": True}})
        return {"message": "All property documents verified by admin"}
    else:
        raise HTTPException(
            status_code=401, detail="Could not find property in the database")


@app.post("/api/admin-get-all-properties")
async def adminGetAllProperties(verifyAdmin: basicUserDetails, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != verifyAdmin.email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")

    if verifyAdmin.email not in admin_emails:
        raise HTTPException(
            status_code=404, detail="You are not the admin!")
    
    user_data = db.users.find_one({"email": verifyAdmin.email})
    if user_data.get("password") != verifyAdmin.password:
        raise HTTPException(
            status_code=404, detail="You are not the admin!")

    property_data = db.properties.find({})

    if property_data:
        properties = []
        for entity in property_data:
            entity_dict = {}
            for key, value in entity.items():
                if key != "_id":
                    entity_dict[key] = str(value)

            report_count = db.reports.count_documents(
                {"reported": entity['id'], "typeReport": "Property"})
            entity_dict['reports'] = report_count
            properties.append(entity_dict)
        return convert_dict_to_json({"all_properties": jsonable_encoder(properties)})
    else:
        raise HTTPException(
            status_code=401, detail="Could not find property in the database")


@app.post("/api/modify-user-property")
async def modifyUserProperty(userProperty: ModifyProperty, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != userProperty.email:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    if userProperty.price and not is_valid_number(userProperty.price):
        raise HTTPException(
            status_code=401, detail="Enter a price between 1 and 3000")
    
    if not userProperty.for_sale:
        if not is_valid_date(userProperty.start_date) or not is_valid_date(userProperty.end_date):
            raise HTTPException(
            status_code=401, detail="Invalid date!")
    
        if not is_end_date_greater(userProperty.start_date, userProperty.end_date):
            raise HTTPException(
                status_code=401, detail="End date should be atleast one month greater")
    

    prop_data = db.properties.find_one({"id": userProperty.property_id})
    if prop_data:
        updated_property = {
            "id": userProperty.property_id or prop_data.get("id", ""),
            "name": userProperty.name or prop_data.get("name", ""),
            "owner_email": userProperty.email or prop_data.get("owner_email"),
            "for_sale": userProperty.for_sale,
            "price": userProperty.price or prop_data.get("price", ""),
            "location": userProperty.location or prop_data.get("location", ""),
            "amenities": userProperty.amenities or prop_data.get("amenities", ""),
            "start_date": userProperty.start_date or prop_data.get("start_date", ""),
            "end_date": userProperty.end_date or prop_data.get("end_date", ""),
            "view_listing": True,
            "is_sold": False,
            "is_admin_verified": prop_data.get('is_admin_verified'),
            "property_documents": userProperty.documents
        }

        result = db.properties.replace_one({"id": userProperty.property_id},
                                           updated_property)

        if result.acknowledged:
            return {"message": "Property modified successfully"}
        else:
            raise HTTPException(
            status_code=404, detail="Could not add property")
    else:
        raise HTTPException(
            status_code=404, detail="Could not find property")


@app.post("/api/delete-user-property")
async def deleteUserProperty(property: DeleteProperty, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != property.email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")

    query = {'email': property.email}
    update = {'$pull': {'properties': property.propertyId}}
    result = db.users.update_one(query, update)

    property_data = db.properties.find_one({"id": property.propertyId})
    property_documents = property_data["property_documents"]

    for document_id in property_documents:
        await deletePropertyDocuments(DocumentIdentity(document_id=document_id), current_user)

    result = db.reports.delete_many(
        {"typeReport": 'Property', "reported": property.propertyId})
    result = db.contracts.delete_many({"amount_paid": 0})

    result = db.properties.delete_one({"id": property.propertyId})
    if result.acknowledged:
        return {"message": "Property deleted successfully"}
    else:
        raise HTTPException(
            status_code=404, detail="Could not find property")


@app.post("/api/toggle-view-listing-property")
async def deleteUserProperty(property: IdentifyProperty, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != property.doer_email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    
    user_info = db.users.find_one({"email": current_user.email})
    if property.propertyId not in user_info["properties"]:
        raise HTTPException(
            status_code=404, detail="Could not find property linked to you")

    query = {'id': property.propertyId}
    propertyToUpdate = db.properties.find_one(query)
    update = {"$set": {'view_listing': not propertyToUpdate['view_listing']}}
    result = db.properties.update_one(query, update)
    if result.acknowledged:
        return {not propertyToUpdate['view_listing']}
    raise HTTPException(
            status_code=404, detail="Could not find property")


@app.post("/api/admin-get-all-users")
async def adminGetUsers(verifyAdmin: basicUserDetails, current_user: basicUserDetails = Depends(get_current_active_user)):
    if current_user.email != verifyAdmin.email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    if verifyAdmin.email not in admin_emails:
        raise HTTPException(
            status_code=404, detail="You are not the admin!")

    user_data = db.users.find_one({"email": verifyAdmin.email})
    if user_data.get("password") != verifyAdmin.password:
        raise HTTPException(
            status_code=404, detail="You are not the admin!")
        
    users = []
    projection = {"_id": 0, "name": 1, "email": 1}
    cursor = db.users.find({}, projection)
    for user in cursor:
        report_count = db.reports.count_documents(
            {"reported": user['email'], "typeReport": "User"})
        user['reports'] = report_count
        if user["email"] not in admin_emails:
            users.append(user)
    return jsonable_encoder(users)


@app.post("/api/available-properties")
async def getListedProperties(userInfo: EmailDetails, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != userInfo.email:
        raise HTTPException(
            status_code=401, detail="Email not matching")
    
    query = {
        "$and": [
            {"owner_email": {"$ne": userInfo.email}},
            {"view_listing": True},
        ]
    }
    projection = {"_id": 0, "property_documents": 0}
    cursor = db.properties.find(query, projection)
    response_data = jsonable_encoder(list(cursor))
    return response_data


@app.post("/api/filter-properties")
async def filter_properties(filter_property_input: PropertyFilter, current_user: basicUserDetails = Depends(get_current_active_user)):
    if current_user.email != filter_property_input.user_email:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    projection = {"_id": 0}
    query = {
        "$and": [
            {"owner_email": {"$ne": filter_property_input.user_email}},
            {"view_listing": True}
        ]
    }
    properties = db.properties.find(query, projection)
    filtered_properties = []
    for property in properties:
        if (
                (filter_property_input.location == "" or property['location'].lower() == filter_property_input.location.lower()) and
                (filter_property_input.minPrice == "" or (property['price'] is not None and int(property['price']) >= int(filter_property_input.minPrice))) and
                (filter_property_input.maxPrice == "" or (property['price'] is not None and int(property['price']) <= int(filter_property_input.maxPrice))) and
                (filter_property_input.amenities == "" or getAmenities(filter_property_input.amenities, property["amenities"])) and
                (
                    filter_property_input.sale == "" or (filter_property_input.sale == "Buy" and property['for_sale']) or
                    (filter_property_input.sale == "Rent" and not property['for_sale'] and is_property_available_for_dates(
                        property, filter_property_input.startDate, filter_property_input.endDate))
                )):
            filtered_properties.append(property)

    response_data = jsonable_encoder(filtered_properties)
    return response_data


@app.post("/api/update-user-profile")
async def modifyUserProperty(userProfile: UpdatedProfile, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != userProfile.email:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    user_data = db.users.find_one({"email": userProfile.email})
    if user_data:

        updatedUser = {
            "name": userProfile.name,
            "email": user_data['email'],
            "password": user_data["password"],
            "properties": user_data["properties"]
        }

        db.users.update_one({"email": userProfile.email},
                            {"$set": updatedUser})

        return {"message": "Successfully updated the details"}

    else:
        raise HTTPException(
            status_code=404, detail="Could not modify property")


@app.post("/api/create-contract")
async def createContract(contractDetails: ContractDetails, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != contractDetails.doer_email:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    contract_info = {
        "id": str(uuid.uuid4()),
        "buyer_email": contractDetails.buyer_email,
        "seller_email": contractDetails.seller_email,
        "property_id": contractDetails.property_id,
        "property_name": contractDetails.property_name,
        "property_value": contractDetails.property_value,
        "for_sale": contractDetails.for_sale,
        "property_location": contractDetails.property_location,
        "property_amenities": contractDetails.property_amenities,
        "property_fromDate": contractDetails.property_fromDate,
        "property_toDate": contractDetails.property_toDate,
        "amount_paid": 0,
        "buyerVerified": False,
        "sellerVerified": False,
    }
    json_string = json.dumps(contract_info)
    sha256_hash = hashlib.sha256(json_string.encode()).hexdigest()

    contract_info['contract_hash'] = sha256_hash
    result = db.contracts.insert_one(contract_info)
    if result.acknowledged:
        return convert_dict_to_json(contract_info)
    return {"message": "Unsuccess"}


@app.post("/api/delete-contract")
async def deleteContract(contract_id: ContractID, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != contract_id.doer_email:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    contract_info = {
        "id": contract_id.contract_id,
    }

    result = db.contracts.find_one(contract_info)

    if result:
        if not (result['buyer_email'] == contract_id.doer_email or result['seller_email'] == contract_id.doer_email):
            raise HTTPException(
            status_code=401, detail="Not your contract to delete")

        if result["buyerVerified"] == False and result["sellerVerified"] == False:
            db.contracts.delete_one(contract_info)
            return {"wasDeleted": True}
        else:
            return {"wasDeleted": True}
        
    else:
        raise HTTPException(
            status_code=404, detail="Could not find contract")


@app.post("/api/get-contract-details")
async def getContractDetails(contractDetails: ContractDetails, current_user: basicUserDetails = Depends(get_current_active_user)):

    if current_user.email != contractDetails.doer_email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    contract_info = {
        "buyer_email": contractDetails.buyer_email,
        "seller_email": contractDetails.seller_email,
        "property_name": contractDetails.property_name,
        "property_value": contractDetails.property_value,
        "for_sale": contractDetails.for_sale,
        "property_location": contractDetails.property_location,
        "property_amenities": contractDetails.property_amenities,
        "property_fromDate": contractDetails.property_fromDate,
        "property_toDate": contractDetails.property_toDate,
    }
    contractDetails = db.contracts.find_one(contract_info)
    if contractDetails:
        return convert_dict_to_json(contractDetails)
    return {"message": "contract details does not exist"}


@app.post("/api/check-contract-exists")
async def checkContractExists(contractDetails: CheckForContract, current_user: basicUserDetails = Depends(get_current_active_user)):

    if contractDetails.doer_email != current_user.email:
        raise HTTPException(
            status_code=404, detail="Not Authorised")

    contract_info = {
        "buyer_email": contractDetails.buyer_email,
        "seller_email": contractDetails.seller_email,
        "property_id": contractDetails.property_id,
    }
    contractDetails = db.contracts.find_one(contract_info)
    if contractDetails:
        return {"contract_exists": True}
    return {"contract_exists": False}


@app.post("/api/ongoing-contracts-for-buyer")
async def ongoignContractForBuyer(buyer: EmailDetails, current_user: basicUserDetails = Depends(get_current_active_user)):

    if buyer.email != current_user.email:
        raise HTTPException(
            status_code=401, detail="Not authorised")
    
    query = {
        "buyer_email": buyer.email,
        "sellerVerified": {"$ne": True}
    }
    contracts = []

    # Project only the fields you need (excluding "_id")
    projection = {"_id": 0, "id": 1, "buyer_email": 1, "seller_email": 1, "property_name": 1, "property_value": 1,
                  "property_type": 1,  "property_location": 1, "property_amenities": 1, "property_fromDate": 1, "property_toDate": 1, "contract_hash": 1, "property_id": 1, "for_sale": 1, "buyerVerified": 1, "sellerVerified": 1}

    # Use find with query and projection
    cursor = db.contracts.find(query, projection)
    for contract in cursor:
        contracts.append(contract)
    # Serialize the response using the custom JSON encoder
    response_data = jsonable_encoder(contracts)
    return response_data


@app.post("/api/available-contracts")
async def getListedProperties(userInfo: EmailDetails, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != userInfo.email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    contracts = []
    query = {"seller_email": userInfo.email}

    # Project only the fields you need (excluding "_id")
    projection = {"_id": 0, "id": 1, "buyer_email": 1, "seller_email": 1, "property_name": 1, "property_value": 1,
                  "property_type": 1,  "property_location": 1, "property_amenities": 1, "property_fromDate": 1, "property_toDate": 1, "contract_hash": 1, "property_id": 1, "for_sale": 1, "buyerVerified": 1, "sellerVerified": 1}

    # Use find with query and projection
    cursor = db.contracts.find(query, projection)
    for contract in cursor:
        contracts.append(contract)
    # Serialize the response using the custom JSON encoder
    response_data = jsonable_encoder(contracts)
    return response_data


@app.post("/api/show-pending-payments-for-buyer")
async def showPendingPaymentsForBuyer(userInfo: EmailDetails, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != userInfo.email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    contracts = []
    query = {"buyer_email": userInfo.email, "sellerVerified": True}

    # Project only the fields you need (excluding "_id")
    projection = {"_id": 0, "id": 1, "buyer_email": 1, "seller_email": 1, "property_name": 1, "property_value": 1, "is_admin_verified": 1,
                  "property_type": 1,  "property_location": 1, "property_amenities": 1, "property_fromDate": 1, "property_toDate": 1, "contract_hash": 1, "property_id": 1, "for_sale": 1, "amount_paid": 1}

    # Use find with query and projection
    cursor = db.contracts.find(query, projection)

    for contract in cursor:
        property_data = db.properties.find_one({"id": contract["property_id"]})
        if not property_data["is_sold"]:
            contracts.append(contract)
    # Serialize the response using the custom JSON encoder
    response_data = jsonable_encoder(contracts)
    return response_data


@app.post("/api/show-past-history-contracts")
async def getPastHistory(userInfo: EmailDetails, current_user: basicUserDetails = Depends(get_current_active_user)):
    
    if current_user.email != userInfo.email:
        raise HTTPException(
            status_code=401, detail="Not Authorised")
    
    contracts = []
    query = {
        "$or": [
            {"seller_email": userInfo.email,
                "sellerVerified": True, "buyerVerified": True},
            {"buyer_email": userInfo.email,
                "buyerVerified": True, "sellerVerified": True}
        ]
    }

    # Project only the fields you need (excluding "_id")
    projection = {"_id": 0, "id": 1, "buyer_email": 1, "seller_email": 1, "property_name": 1, "property_value": 1,
                  "property_type": 1,  "property_location": 1, "property_amenities": 1, "property_fromDate": 1, "property_toDate": 1, "contract_hash": 1, "property_id": 1, "for_sale": 1, "buyerVerified": 1, "sellerVerified": 1}

    # Use find with query and projection
    cursor = db.contracts.find(query, projection)
    for contract in cursor:
        contracts.append(contract)
    # Serialize the response using the custom JSON encoder
    response_data = jsonable_encoder(contracts)
    return response_data



@app.post("/api/send-verification-email")
async def send_verification_email(user_email: EmailDetails):
    email_addr = 'computerinsecurities@gmail.com'
    email_pass = 'mrpzoaftemkeskas'

    msg = EmailMessage()
    msg['Subject'] = "Verification code"
    msg['From'] = email_addr
    msg['To'] = user_email.email

    code = ""
    for i in range(6):
        code += str(random.randint(1, 9))

    msg.set_content(f"Verification code: {code}", )

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(email_addr, email_pass)
        smtp.send_message(msg)

    return convert_dict_to_json({"verification_code": code})


@app.post("/api/check-email-exists")
async def checkEmailExists(user_email: EmailDetails):
    user = db.users.find_one({"email": user_email.email})
    if (user is None):
        return {"exists": False}
    return {"exists": True}


@app.post("/api/portal-init-contract")
async def portalInitContract(contractId: PortalContractSign, current_user: basicUserDetails = Depends(get_current_active_user)):

    verify_contract_data = db.contracts.find_one({"id": contractId.contractId})

    with open("portal_privateKey.pem", 'r') as file:
        private_pem = file.read()

    if verify_contract_data:
        contract_hash = verify_contract_data["contract_hash"]
        portal_sign = encode(private_pem, contract_hash)
        if portal_sign:
            return convert_dict_to_json({"message": contract_hash, "signature": portal_sign})
    else:
        raise HTTPException(
            status_code=401, detail="Could not find contract")


@app.post("/api/portal-verify-portalSignature")
async def portalVerifyPortalSigntaure(signVerification: SignatureVerification, current_user: basicUserDetails = Depends(get_current_active_user)):
    original_message = signVerification.message
    decoded_message = decode(signVerification.key, signVerification.sign)

    if original_message == decoded_message:
        return {"message": "Contract generated by portal", "status": True}
    else:
        return {"message": "Contract NOT generated by portal", "status": False}


@app.post("/api/add-user-signature")
async def addUserSignature(privateKey: PrivateKeyEncryption, current_user: basicUserDetails = Depends(get_current_active_user)):
    original_message = privateKey.contract_hash
    encoded_message = encode(privateKey.key, original_message)

    if encoded_message:
        return convert_dict_to_json({"encoded_message": encoded_message})
    else:
        raise HTTPException(
            status_code=401, detail="Given contract couldn't be encrypted using private key")


@app.post("/api/portal-verify-UserSignature")
async def portalVerifyUserSigntaure(signVerification: PublicKeyDecryption, current_user: basicUserDetails = Depends(get_current_active_user)):

    if signVerification.email != current_user.email:
        raise HTTPException(
            status_code=401, detail="Not authorised")

    
    encoded_message = signVerification.encoded_message
    contractDetails = db.contracts.find_one(
        {"id": signVerification.contract_id})

    isBuyer = False
    if signVerification.email == contractDetails["buyer_email"]:
        isBuyer = True

    if isBuyer:
        user_info = db.users.find_one(
            {'email': contractDetails["buyer_email"]})
    else:
        user_info = db.users.find_one(
            {'email': contractDetails["seller_email"]})

    if not user_info:
        raise HTTPException(
            status_code=404, detail="Could not find user")

    user_public_key = user_info["publicKey"]
    decoded_message = decode(user_public_key, encoded_message)
    contract_hash = contractDetails["contract_hash"]

    if contract_hash == decoded_message:
        if isBuyer:
            update_result = db.contracts.update_one(
                {'buyer_email': user_info['email'],
                    "id": signVerification.contract_id},
                {'$set': {'buyerVerified': True}}
            )
        else:
            update_result = db.contracts.update_one(
                {'seller_email': user_info['email'],
                    "id": signVerification.contract_id},
                {'$set': {'sellerVerified': True}}
            )
            delete_result = db.contracts.delete_many(
                {'seller_email': user_info["email"],
                 'sellerVerified': {'$ne': True}}
            )
            property_id = contractDetails["property_id"]
            property_result = db.properties.update_one(
                {'id': property_id},
                {'$set': {'view_listing': False}}
            )
        return {"message": "User has signed the contract correctly", "status": True}
    else:
        return {"message": "User has NOT signed the contract correctly", "status": False}





if __name__ == "__main__":
    uvicorn.run(
        app,
        host="192.168.2.236",
        port=5050,
        ssl_keyfile="key.pem",  # Path to your private key file
        ssl_certfile="cert.pem",  # Path to your certificate file
    )
