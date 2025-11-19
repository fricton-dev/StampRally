import unittest

from starlette.exceptions import HTTPException

from routers import tenants as tenant_router


class CampaignTimezoneTests(unittest.TestCase):
    def test_coerce_timezone_accepts_utc_offset(self) -> None:
        self.assertEqual(
            tenant_router._coerce_timezone_to_offset("UTC+09:00"),
            "UTC+09:00",
        )

    def test_coerce_timezone_rejects_out_of_range_offset(self) -> None:
        self.assertIsNone(tenant_router._coerce_timezone_to_offset("UTC+15:00"))

    def test_validate_campaign_timezone_accepts_proper_format(self) -> None:
        self.assertEqual(
            tenant_router._validate_campaign_timezone("UTC-05:30"),
            "UTC-05:30",
        )

    def test_validate_campaign_timezone_rejects_invalid_values(self) -> None:
        with self.assertRaises(HTTPException) as excinfo:
            tenant_router._validate_campaign_timezone("InvalidZone")
        self.assertEqual(excinfo.exception.status_code, 400)

    def test_normalize_campaign_timezone_falls_back_to_default(self) -> None:
        normalized = tenant_router._normalize_campaign_timezone(None)
        self.assertEqual(normalized, tenant_router.DEFAULT_CAMPAIGN_TIMEZONE)


if __name__ == "__main__":
    unittest.main()
