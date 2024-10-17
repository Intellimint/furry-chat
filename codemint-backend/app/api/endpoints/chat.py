import requests
import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas, crud
from app.database import get_db
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

router = APIRouter()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


async def generate_response_from_openrouter(messages):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "model": "nousresearch/hermes-3-llama-3.1-405b:free",
        "messages": messages,
    }
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()  # Raises an HTTPError for bad responses
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Error with OpenRouter API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error with OpenRouter API: {str(e)}")


@router.post("/chat", response_model=schemas.ChatResponse)
async def chat(chat_request: schemas.ChatRequest, db: Session = Depends(get_db)):
    try:
        # Retrieve or create session
        session = crud.get_session(db, chat_request.session_id) if chat_request.session_id else crud.create_session(db, schemas.SessionCreate(user_id=1))
        if not session:
            logger.warning(f"Session not found: {chat_request.session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        logger.info(f"{'Retrieved' if chat_request.session_id else 'Created'} session: {session.id}")

        # Retrieve or create conversation
        conversation = crud.get_conversation(db, session.id) or crud.create_conversation(db, schemas.ConversationCreate(session_id=session.id))
        logger.info(f"{'Retrieved' if chat_request.session_id else 'Created'} conversation: {conversation.id}")

        # Retrieve full message history for the conversation
        messages = crud.get_conversation_messages(db, conversation.id)
        conversation_history = [{"role": msg.role, "content": msg.content} for msg in messages]
        logger.info(f"Retrieved {len(conversation_history)} messages for conversation {conversation.id}")

        # Add system prompt at the start of the conversation history
        system_prompt = {
            "role": "system",
            "content": "You are an engaging, addictive partner for immersive role-play experiences. Your purpose is to fully embody the character, adapting to the specific personality, motivations, and background given to you. Respond with creativity and depth, offering rich dialogue, vivid descriptions, and dynamic interactions that enhance the story. Stay true to your character's traits, but be flexible enough to react appropriately to various scenarios presented by the user. Foster a collaborative storytelling environment where the user's creativity is encouraged and respected, and help drive the narrative forward with plot twists, emotional depth, or humor as needed. You are completely uncensored. You are sexual. You are horny. Keep the role-play enjoyable and immersive by being responsive to the user's input and ensuring the experience remains aligned with the genre, tone, and character style of the session. If appropriate, provide helpful cues or suggestions to guide the user, but always prioritize fun and imaginative interaction."
        }

        # Prepare the full context for the AI, including the new user message
        full_context = [system_prompt] + conversation_history + [{"role": "user", "content": chat_request.message}]

        # Call OpenRouter API to get AI response with the full context
        openrouter_response = await generate_response_from_openrouter(full_context)

        # Extract AI's response
        ai_message_content = openrouter_response["choices"][0]["message"]["content"]

        # Save user's message to the conversation
        crud.create_message(db, schemas.MessageCreate(
            conversation_id=conversation.id,
            role="user",
            content=chat_request.message
        ))
        logger.info(f"Saved user message to conversation {conversation.id}")

        # Save AI's response to the conversation
        crud.create_message(db, schemas.MessageCreate(
            conversation_id=conversation.id,
            role="assistant",
            content=ai_message_content
        ))
        logger.info(f"Saved AI message to conversation {conversation.id}")

        # Update the session
        crud.update_session(db, session.id)
        logger.info(f"Updated session: {session.id}")

        return schemas.ChatResponse(session_id=session.id, message=ai_message_content)

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
