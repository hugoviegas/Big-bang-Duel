from game_engine import (
    CARD_DODGE,
    CARD_DOUBLE_SHOT,
    CARD_RELOAD,
    CARD_SHOT,
    MAX_AMMO,
    MAX_DODGE_STREAK,
    get_available_cards,
    resolve_cards,
)


def test_reload_always_grants_one_ammo_even_if_interrupted():
    result = resolve_cards(CARD_RELOAD, CARD_SHOT, 0, 1)
    assert result["p_ammo_change"] == 1
    assert result["o_ammo_change"] == -1


def test_reload_does_not_exceed_max_ammo_cap():
    result = resolve_cards(CARD_RELOAD, CARD_DODGE, MAX_AMMO, 0)
    assert result["p_ammo_change"] == 0


def test_double_shot_vs_dodge_still_deals_one_damage():
    result = resolve_cards(CARD_DOUBLE_SHOT, CARD_DODGE, 2, 0)
    assert result["o_life_lost"] == 1


def test_dodge_is_blocked_after_max_streak():
    cards = get_available_cards("advanced", ammo=2, double_shots_left=2, dodge_streak=MAX_DODGE_STREAK)
    assert CARD_DODGE not in cards


def test_double_shot_requires_ammo_and_remaining_uses():
    cards_without_ammo = get_available_cards("advanced", ammo=1, double_shots_left=2, dodge_streak=0)
    assert CARD_DOUBLE_SHOT not in cards_without_ammo

    cards_without_uses = get_available_cards("advanced", ammo=2, double_shots_left=0, dodge_streak=0)
    assert CARD_DOUBLE_SHOT not in cards_without_uses
