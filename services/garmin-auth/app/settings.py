from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    shared_secret: str
    log_level: str = "info"


settings = Settings()
