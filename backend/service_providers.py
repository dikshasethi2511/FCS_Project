from all_imports import *

client = MongoClient("mongodb://localhost:27017/")
db = client.fcsproject
fs_users = gridfs.GridFS(db, collection='users')
fs_properties = gridfs.GridFS(db, collection='properties')
fs_documents = gridfs.GridFS(db, collection='documents')
app = FastAPI()


origins = [
    "http://localhost:4200",
    "https://192.168.2.236",
    "http://192.168.2.236",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # You can specify specific HTTP methods if needed
    allow_headers=["*"],  # You can specify specific headers if needed
)


admin_emails = ["computerinsecurities@gmail.com"]
