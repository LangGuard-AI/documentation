import rate_limit


class FakeTable:
    def __init__(self):
        self.items = {}

    def get_item(self, Key):
        item = self.items.get(Key["pk"])
        return {"Item": item} if item else {}

    def update_item(self, Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues, **_kwargs):
        item = self.items.setdefault(Key["pk"], {"pk": Key["pk"]})
        for attr, value_key in ((":m", "micros"), (":one", "count")):
            if attr in ExpressionAttributeValues:
                item[value_key] = item.get(value_key, 0) + ExpressionAttributeValues[attr]
        item.setdefault("ttl", ExpressionAttributeValues[":exp"])
        return {"Attributes": {"count": item.get("count", 0)}}


_T0 = 1_750_000_000  # mid-June 2025, so a few days stay inside one month
_DAY = 86_400


def test_micros_exact_integer_math():
    assert rate_limit._micros(10_000, 500) == 9600
    assert rate_limit._micros(0, 0) == 0


def test_record_cost_ignored_when_zero():
    table = FakeTable()
    rate_limit.record_cost(table, 0, 0, _T0)
    assert table.items == {}


def test_budget_blocks_at_the_four_dollar_daily_cap():
    table = FakeTable()
    rate_limit.record_cost(table, 4_875_000, 0, _T0)  # $3.90
    assert rate_limit.budget_ok(table, _T0)
    rate_limit.record_cost(table, 125_000, 0, _T0)  # $4.00 in total
    assert not rate_limit.budget_ok(table, _T0)


def test_budget_blocks_at_the_twenty_dollar_monthly_cap():
    table = FakeTable()
    for day in range(5):
        rate_limit.record_cost(table, 4_750_000, 0, _T0 + day * _DAY)  # $3.80/day, under daily cap
    assert rate_limit.budget_ok(table, _T0 + 4 * _DAY)  # $19.00
    rate_limit.record_cost(table, 1_250_000, 0, _T0 + 5 * _DAY)  # $20.00 in total
    assert not rate_limit.budget_ok(table, _T0 + 5 * _DAY)


def test_per_ip_limit_is_thirty_an_hour():
    table = FakeTable()
    assert all(rate_limit.allow_request(table, "203.0.113.1") for _ in range(30))
    assert not rate_limit.allow_request(table, "203.0.113.1")
    assert rate_limit.allow_request(table, "203.0.113.2")


def test_global_limit_is_five_hundred_a_day():
    table = FakeTable()
    allowed = [rate_limit.allow_request(table, f"203.0.113.{i}") for i in range(500)]
    assert all(allowed)
    assert not rate_limit.allow_request(table, "198.51.100.1")


def test_salt_is_the_docs_chatbot_salt():
    assert rate_limit._SALT == "langguard-docs-chatbot"


def test_dynamodb_failure_fails_open():
    class BrokenTable:
        def update_item(self, **_kwargs):
            raise RuntimeError("dynamo down")

        def get_item(self, **_kwargs):
            raise RuntimeError("dynamo down")

    assert rate_limit.allow_request(BrokenTable(), "203.0.113.1")
    assert rate_limit.budget_ok(BrokenTable())
