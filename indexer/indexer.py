import os, io, hashlib
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from pypdf import PdfReader

def chunkText(text: str, size: int = 900, overlap: int = 150) -> List[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i+size]
        chunks.append(" ".join(chunk))
        i += size - overlap if size > overlap else size
    return [c for c in chunks if c.strip()]

def readPdf(bytesData: bytes) -> str:
    reader = PdfReader(io.BytesIO(bytesData))
    parts = []
    for p in reader.pages:
        parts.append(p.extract_text() or "")
    return "\n".join(parts)

def detectText(bytesData: bytes, filename: Optional[str], contentType: Optional[str]) -> str:
    lower = (filename or "").lower()
    ct = (contentType or "").lower()
    if lower.endswith(".pdf") or "pdf" in ct:
        return readPdf(bytesData)
    try:
        return bytesData.decode("utf-8")
    except:
        return ""

def buildDocId(recordId: Optional[str], bytesData: bytes) -> str:
    if recordId:
        return str(recordId)
    return hashlib.sha256(bytesData).hexdigest()[:24]

class DocumentIndexer:
    def __init__(self):
        self.qdrantUrl = os.getenv("QDRANT_URL")
        self.qdrantKey = os.getenv("QDRANT_API_KEY")
        self.collection = os.getenv("QDRANT_COLLECTION", "medical_records")
        self.modelName = os.getenv("EMBED_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
        self.model = SentenceTransformer(self.modelName)
        self.dim = self.model.get_sentence_embedding_dimension()
        self.client = QdrantClient(url=self.qdrantUrl, api_key=self.qdrantKey)
        self.ensureCollection()

    def ensureCollection(self):
        existing = [c.name for c in self.client.get_collections().collections]
        if self.collection not in existing:
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=self.dim, distance=Distance.COSINE)
            )

    def embed(self, texts: List[str]) -> List[List[float]]:
        return [v.tolist() for v in self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)]

    def upsert(self, docId: str, chunks: List[str], payload: Dict):
        vectors = self.embed(chunks)
        points = []
        for i, v in enumerate(vectors):
            pid = f"{docId}-{i}"
            pl = dict(payload)
            pl.update({"docId": docId, "chunkIndex": i})
            points.append(PointStruct(id=pid, vector=v, payload=pl))
        self.client.upsert(collection_name=self.collection, points=points)
        return {"docId": docId, "chunks": len(points)}

    def indexBytes(self, bytesData: bytes, filename: Optional[str], contentType: Optional[str], payload: Dict):
        text = detectText(bytesData, filename, contentType)
        if not text.strip():
            raise ValueError("no text content extracted")
        chunks = chunkText(text)
        docId = buildDocId(payload.get("recordId"), bytesData)
        return self.upsert(docId, chunks, payload)
