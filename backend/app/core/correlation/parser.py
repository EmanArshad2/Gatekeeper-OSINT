import re
class ContextParser:
    TELEGRAM_REGEX = re.compile(
        r'@[A-Za-z0-9_]{5,32}'
    )
    EMAIL_REGEX = re.compile(
        r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    )
    WEBSITE_REGEX = re.compile(
        r'(?:https?://)?(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    )
    PHONE_REGEX = re.compile(
        r'(?:\+?\d[\d\s\-]{7,15}\d)'
    )
    def parse(self, text: str):
        return {
            "telegram_users": list(
                set(self.TELEGRAM_REGEX.findall(text))
            ),
            "emails": list(
                set(self.EMAIL_REGEX.findall(text))
            ),
            "websites": list(
                set(self.WEBSITE_REGEX.findall(text))
            ),
            "phones": list(
                set(self.PHONE_REGEX.findall(text))
            )
        }
context_parser = ContextParser()