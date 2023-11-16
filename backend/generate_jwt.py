from all_imports import *
from service_providers import *

ACCESS_TOKEN_EXPIRE_MINUTES = 45
JWT_SECRET = config("secret")
JWT_ALGORITHM = config("algorithm")

oauth_2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user-login")


def get_user(username: str):
    user_data = db.users.find_one({"email": username})
    if user_data:
        return basicUserDetails(email=user_data.get("email"), password=user_data.get("password"))
    else:
        return None


def create_access_token(data: dict, expires_delta: timedelta or None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth_2_scheme)):
    credential_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                         detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credential_exception

        token_data = TokenData(username=username)

    except JWTError:
        raise credential_exception

    user = get_user(token_data.username)
    if user is None:
        raise credential_exception
    return user


async def get_current_active_user(current_user: basicUserDetails = Depends(get_current_user)):
    return current_user
