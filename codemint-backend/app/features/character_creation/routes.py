from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from . import crud, schemas

router = APIRouter()

@router.post("/characters/", response_model=schemas.Character)
def create_character(character: schemas.CharacterCreate, db: Session = Depends(get_db)):
    return crud.create_character(db=db, character=character, creator_id=1)  # TODO: Get actual user id

@router.get("/characters/", response_model=List[schemas.Character])
def read_characters(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    characters = crud.get_characters(db, skip=skip, limit=limit)
    return characters

@router.get("/characters/{character_id}", response_model=schemas.Character)
def read_character(character_id: int, db: Session = Depends(get_db)):
    db_character = crud.get_character(db, character_id=character_id)
    if db_character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return db_character

@router.put("/characters/{character_id}", response_model=schemas.Character)
def update_character(character_id: int, character: schemas.CharacterCreate, db: Session = Depends(get_db)):
    db_character = crud.update_character(db, character_id=character_id, character=character)
    if db_character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return db_character

@router.delete("/characters/{character_id}", response_model=schemas.Character)
def delete_character(character_id: int, db: Session = Depends(get_db)):
    db_character = crud.delete_character(db, character_id=character_id)
    if db_character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return db_character