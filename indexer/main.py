from fastapi import FastAPI
from routes.medical_records import router as med_router

app = FastAPI()
app.include_router(med_router)

@app.get("/")
async def root():
    return {"message": "Indexer is live. Use /medical-records endpoints."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=4004, reload=True)
