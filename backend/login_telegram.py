import asyncio
from app.core.telegram.client import client
async def main():
    print("Starting Telegram authentication...")
    await client.start()
    me = await client.get_me()
    print("\n========== TELEGRAM CONNECTED ==========")
    print("ID:", me.id)
    print("Username:", me.username)
    print("Name:", me.first_name)
    print("Phone:", me.phone)
    print("========================================")
if __name__ == "__main__":
    asyncio.run(main())