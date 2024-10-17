from pydantic import BaseModel

class CharacterBase(BaseModel):
    name: str
    avatar_url: str
    gender_identity: str
    sexual_orientation: str
    description: str
    persona: str
    first_message: str

class CharacterCreate(CharacterBase):
    pass

class Character(CharacterBase):
    id: int
    creator_id: int

    class Config:
        orm_mode = True