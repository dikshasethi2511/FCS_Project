from pydantic import BaseModel
from fastapi import Form, UploadFile, File


class basicUserDetails(BaseModel):
    email: str
    password: str


class EmailDetails(BaseModel):
    email: str


class UpdatedProfile(BaseModel):
    email: str
    name: str


class DeleteUser(BaseModel):
    adminEmail: str
    adminPassword: str
    toBeDeletedEmail: str


class AdminDeleteProperty(BaseModel):
    adminEmail: str
    adminPassword: str
    propertyId: str


class userProperty(BaseModel):
    email: str
    name: str
    price: str
    location: str
    amenities: str
    start_date: str
    end_date: str
    documents: UploadFile = File(...)
    for_sale: bool


class ModifyProperty(BaseModel):
    property_id: str
    email: str
    name: str
    price: str
    location: str
    amenities: str
    start_date: str
    end_date: str
    documents: str
    for_sale: bool


class Property(BaseModel):
    name: str
    value: str


class SearchProperty(BaseModel):
    doer_email: str
    name: str
    owner_email: str


class PropertyFilter(BaseModel):
    user_email: str
    sale: str
    minPrice: str 
    maxPrice: str 
    location: str 
    amenities: str
    startDate: str
    endDate: str 


class ContractDetails(BaseModel):
    doer_email: str
    id: str
    property_id: str
    buyer_email: str
    seller_email: str
    property_name: str
    property_value: str
    for_sale: bool
    property_location: str
    property_amenities: str
    property_fromDate: str
    property_toDate: str


class ReportDetails(BaseModel):
    report_by: str
    reported: str
    type_report: str


class CheckForContract(BaseModel):
    doer_email: str
    buyer_email: str
    seller_email: str
    property_id: str


class AddContractSign(BaseModel):
    contractId: str
    signature: str
    isBuyer: bool
    userPrivateKey: str


class PortalContractSign(BaseModel):
    contractId: str


class DeleteProperty(BaseModel):
    email: str
    propertyId: str


class IdentifyProperty(BaseModel):
    doer_email:str
    propertyId: str


class ContractID(BaseModel):
    doer_email: str
    contract_id: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str or None = None


class DigitalSignature(BaseModel):
    message: str
    sign: str


class SignatureVerification(BaseModel):
    key: str
    message: str
    sign: str


class PrivateKeyEncryption(BaseModel):
    contract_hash: str
    key: str


class PublicKeyDecryption(BaseModel):
    encoded_message: str
    contract_id: str
    email: str


class ModifyDocument(BaseModel):
    property_id: str
    document_identifier: str


class DocumentIdentity(BaseModel):
    doer_email: str
    document_id: str


class Wallet(BaseModel):
    doer_email: str
    wallet_id: str


class Transaction(BaseModel):
    owner_wallet_id: str
    buyer_wallet_id: str
    amount: str


class TransferFund(BaseModel):
    doer_email: str
    wallet_id: str
    wallet_pin: str
    amount: str
    contract_id: str


class TransferFundToUser(BaseModel):
    email: str
    amount: str


class TimerStatus(BaseModel):
    is_running: bool
    time_remaining: int


class Duration(BaseModel):
    duration: int
