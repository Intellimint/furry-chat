from sqlalchemy import Column, Integer, String, Text
from app.database import Base

class Character(Base):
    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    avatar_url = Column(String)
    gender_identity = Column(String)
    sexual_orientation = Column(String)
    description = Column(Text)
    persona = Column(Text)
    first_message = Column(Text)
    creator_id = Column(Integer)  # We'll link this to users later