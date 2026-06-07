from sqlalchemy import create_engine, text
from config import settings

engine = create_engine(settings.DATABASE_URL)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("DB CONNECTED:", result.fetchone())
except Exception as e:
    print("DB CONNECTION FAILED:", e)