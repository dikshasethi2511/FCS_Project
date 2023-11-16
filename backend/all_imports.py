from email.message import EmailMessage
import numpy as np
import pytesseract
import smtplib
import hashlib
import random
import cv2

import json
import uuid

import base64
import struct
import random
import math
import re

from datetime import datetime, timedelta
from jose import JWTError, jwt
from base64 import b64encode

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import FastAPI, HTTPException, UploadFile, Depends, status, Request

from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder  
from fastapi import Response
from decouple import config
from pymongo import MongoClient
from bson import ObjectId  

import gridfs
import uvicorn

from models import *
