import os, requests, io, hashlib
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
import pytesseract
import fitz  # PyMuPDF
from PIL import Image
import uuid
from dotenv import load_dotenv
load_dotenv()
from qdrant_client.models import Filter, FieldCondition, MatchValue




qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)
collection = os.getenv("QDRANT_COLLECTION", "medical_records")
model = SentenceTransformer(os.getenv("EMBED_MODEL_NAME", "all-MiniLM-L6-v2"))

def ensure_collection():
    colls = [c.name for c in qdrant.get_collections().collections]
    if collection not in colls:
        qdrant.create_collection(collection_name=collection,
                                 vectors_config=VectorParams(size=model.get_sentence_embedding_dimension(), distance=Distance.COSINE))



def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""

    for page in doc:
        # First try normal text extraction
        page_text = page.get_text()
        if page_text.strip():
            text += page_text + "\n"
        else:
            # If no text, fallback to OCR
            for img_index, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image = Image.open(io.BytesIO(image_bytes))
                ocr_text = pytesseract.image_to_string(image)
                text += ocr_text + "\n"

    return text.strip()


def embed_text(text: str) -> list[float]:
    return model.encode(text).tolist()

def upsert_document(payload: dict, file_bytes: bytes):
    ensure_collection()
    text = extract_text_from_pdf(file_bytes)
    embedding = embed_text(text)


    doc_id = payload.get("recordId") or str(uuid.uuid4())

    qdrant.upsert(
        collection_name=collection,
        points=[PointStruct(id=doc_id, vector=embedding, payload={**payload, "text": text})]
    )
    return {"docId": doc_id, "charsIndexed": len(text)}

from qdrant_client.models import Filter, FieldCondition, MatchValue

def search_query(q: str, top_k: int = 5, patient_id: str = None):
    ensure_collection()
    vec = embed_text(q)

    # Build filter if patient_id is provided
    qdrant_filter = None
    if patient_id:
        qdrant_filter = Filter(
            must=[FieldCondition(key="patientId", match=MatchValue(value=patient_id))]
        )

    hits = qdrant.search(
        collection_name=collection,
        query_vector=vec,
        limit=top_k,
        filter=qdrant_filter
    )
    return [{"id": h.id, "score": h.score, "payload": h.payload} for h in hits]
def search_query(q: str, top_k: int = 5, patient_id: str = None):
    ensure_collection()
    vec = embed_text(q)

    # Build filter if patient_id is provided
    qdrant_filter = None
    if patient_id:
        qdrant_filter = Filter(
            must=[FieldCondition(key="patientId", match=MatchValue(value=patient_id))]
        )

    hits = qdrant.search(
        collection_name=collection,
        query_vector=vec,
        limit=top_k,
        filter=qdrant_filter
    )
    return [{"id": h.id, "score": h.score, "payload": h.payload} for h in hits]



def ocr_image(image_path: str):
    return pytesseract.image_to_string(Image.open(image_path))
