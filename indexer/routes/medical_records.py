from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import requests
from helpers.utils import upsert_document, search_query

router = APIRouter(prefix="/medical-records", tags=["medical-records"])

class SearchBody(BaseModel):
    q: str
    top_k: int = 5

@router.post("/index")
async def index_record(
    patientId: str = Form(...),
    recordId: str = Form(None),
    title: str = Form(None),
    recordType: str = Form(None),
    doctorName: str = Form(None),
    fileUrl: str = Form(None),
    file: UploadFile = None
):
    if file:
        data = await file.read()
    elif fileUrl:
        resp = requests.get(fileUrl)
        resp.raise_for_status()
        data = resp.content
    else:
        raise HTTPException(status_code=400, detail="Provide file or fileUrl")
    payload = {
        "patientId": patientId,
        "recordId": recordId,
        "title": title,
        "recordType": recordType,
        "doctorName": doctorName,
        "fileUrl": fileUrl
    }
    res = upsert_document(payload, data)
    return JSONResponse(res)

@router.post("/search")
async def search_records(body: SearchBody, patientId: str = None):
    return JSONResponse(search_query(body.q, body.top_k, patientId))
