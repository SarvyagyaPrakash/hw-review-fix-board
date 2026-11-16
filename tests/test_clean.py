import pytest
from pipeline.clean import redact_pii, normalise_text, is_latin_dominant

def test_pii_redaction_email():
    text = "Please contact me at john.doe@example.com for my refund"
    redacted = redact_pii(text)
    assert "john.doe@example.com" not in redacted
    assert "[removed]" in redacted

def test_pii_redaction_phone():
    text = "Call me at +91 9876543210 or 9876543210 right now"
    redacted = redact_pii(text)
    assert "9876543210" not in redacted
    assert "[removed]" in redacted

def test_pii_redaction_upi():
    text = "I paid 500 rupees via player123@okhdfcbank but coins did not credit"
    redacted = redact_pii(text)
    assert "player123@okhdfcbank" not in redacted
    assert "[removed]" in redacted

def test_pii_redaction_url():
    text = "Download better cricket game at https://cricket-game.com/dl or www.playcricket.in"
    redacted = redact_pii(text)
    assert "https://" not in redacted
    assert "www.playcricket.in" not in redacted
    assert "[removed]" in redacted

def test_pii_redaction_long_digits():
    text = "My transaction order id is 987654321012345 please help"
    redacted = redact_pii(text)
    assert "987654321012345" not in redacted
    assert "[removed]" in redacted

def test_latin_dominant_filter():
    # English
    assert is_latin_dominant("The game crashes when auction starts") is True
    # Hinglish in Latin script
    assert is_latin_dominant("Bhai game bahut lag karta hai auction me") is True
    # Devanagari dominant
    assert is_latin_dominant("यह गेम बहुत खराब है बार बार क्रैश होता है") is False
