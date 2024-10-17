from sqlalchemy.orm import Session
from . import models, schemas

def get_character(db: Session, character_id: int):
    return db.query(models.Character).filter(models.Character.id == character_id).first()

def get_characters(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Character).offset(skip).limit(limit).all()

def create_character(db: Session, character: schemas.CharacterCreate, creator_id: int):
    db_character = models.Character(**character.dict(), creator_id=creator_id)
    db.add(db_character)
    db.commit()
    db.refresh(db_character)
    return db_character

def update_character(db: Session, character_id: int, character: schemas.CharacterCreate):
    db_character = get_character(db, character_id)
    if db_character:
        update_data = character.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_character, key, value)
        db.add(db_character)
        db.commit()
        db.refresh(db_character)
    return db_character

def delete_character(db: Session, character_id: int):
    db_character = get_character(db, character_id)
    if db_character:
        db.delete(db_character)
        db.commit()
    return db_character