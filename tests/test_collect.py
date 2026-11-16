import pytest
from pipeline.collect import derive_player_alias, filter_and_whitelist

def test_alias_is_deterministic():
    rid = "test_review_123"
    alias1 = derive_player_alias(rid)
    alias2 = derive_player_alias(rid)
    assert alias1 == alias2
    assert alias1.startswith("Player ")
    num_part = int(alias1.replace("Player ", ""))
    assert 1000 <= num_part <= 9999

def test_whitelist_drops_user_fields():
    raw_record = {
        "reviewId": "gp:AOqpTOE12345",
        "userName": "Jane Doe",
        "userImage": "https://play-lh.googleusercontent.com/avatar.png",
        "content": "Match freezes after auction",
        "score": 2,
        "thumbsUpCount": 14,
        "reviewCreatedVersion": "3.1.2",
        "at": "2026-11-01 10:20:00",
        "replyContent": "Sorry to hear that, please email us",
        "repliedAt": "2026-11-02 12:00:00",
        "appVersion": "3.1.2",
        "userId": "1234567890",
    }
    
    clean = filter_and_whitelist(raw_record)
    
    # Must preserve whitelisted data
    assert clean["id"] == "gp:AOqpTOE12345"
    assert clean["stars"] == 2
    assert clean["content"] == "Match freezes after auction"
    assert clean["thumbs"] == 14
    assert clean["version"] == "3.1.2"
    assert clean["dev_reply_text"] == "Sorry to hear that, please email us"
    assert clean["alias"].startswith("Player ")
    
    # Must DROP all user identifiers and personal data
    forbidden_keys = {"userName", "userImage", "userId", "author", "email"}
    for k in forbidden_keys:
        assert k not in clean
