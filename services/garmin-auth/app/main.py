from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .controllers.auth_controller import router as auth_router
from .errors import GarminAuthError
from .models import ErrorResponse

app = FastAPI(title="garmin-auth")
app.include_router(auth_router)


@app.exception_handler(GarminAuthError)
def handle_garmin_auth_error(_request: Request, exc: GarminAuthError) -> JSONResponse:
    # Convierte cualquier GarminAuthError en {code, message}, nunca un stack trace de garth.
    return JSONResponse(
        status_code=401,
        content=ErrorResponse(code=exc.code, message=exc.message).model_dump(),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
