# app/api/deps.py
from fastapi import Header, HTTPException, Depends
from context.context import decode_token

async def get_current_user(authorization: str | None = Header(default=None, alias="Authorization")):
    print("Authorization header:", authorization)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid or missing token")
    
    try:
        token = authorization[7:]  # убираем "Bearer "
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        if not user_id or not user_id.startswith("user:"):
            raise HTTPException(401, "Invalid token payload")
            
        return {"user_id": int(user_id.split(":")[1])}
    except:
        raise HTTPException(401, "Invalid or expired token")
    

async def get_current_drone(token: str = Header(..., alias="Authorization")) -> dict:
    if not token.startswith("Bearer "):
        raise HTTPException(401, "Invalid token")
    try:
        payload = decode_token(token[7:])
        sub = payload.get("sub")
        if not sub.startswith("drone:"):
            raise HTTPException(401, "Not a drone")
        drone_id = int(sub.split(":")[1])
        return {"drone_id": drone_id}
    except:
        raise HTTPException(401, "Invalid drone token")