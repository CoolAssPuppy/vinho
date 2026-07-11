"""Generate export-options.plist for `xcodebuild -exportArchive`."""
from __future__ import annotations

import plistlib
import subprocess
from pathlib import Path


def _find_distribution_profile(bundle_id: str) -> tuple[str, str] | None:
    """Return (uuid, name) of an installed App Store *distribution* profile for
    `bundle_id`, or None.

    A distribution profile has get-task-allow=false and no ProvisionedDevices.
    We prefer manual signing with an installed profile over cloud/automatic
    signing, because `-allowProvisioningUpdates` requires the App Store Connect
    API key to have cert/profile-management permission -- when it doesn't,
    xcodebuild fails with "Cloud signing permission error / No profiles found"
    even though a valid distribution cert + profile are present locally.
    """
    prof_dir = Path.home() / "Library" / "MobileDevice" / "Provisioning Profiles"
    if not prof_dir.is_dir():
        return None
    for path in sorted(prof_dir.glob("*.mobileprovision")):
        try:
            raw = subprocess.run(
                ["security", "cms", "-D", "-i", str(path)],
                capture_output=True, check=True,
            ).stdout
            data = plistlib.loads(raw)
        except Exception:
            continue
        entitlements = data.get("Entitlements", {})
        app_id = entitlements.get("application-identifier", "")
        is_distribution = (
            entitlements.get("get-task-allow") is False
            and "ProvisionedDevices" not in data
        )
        if is_distribution and app_id.endswith("." + bundle_id):
            return (data.get("UUID", path.stem), data.get("Name", ""))
    return None


def write_app_store(team_id: str, dest_dir: Path, bundle_id: str) -> Path:
    """App Store distribution export options.

    Uses manual signing with an installed distribution profile when one is
    present (avoids the cloud-signing permission requirement); falls back to
    automatic signing otherwise.
    """
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = dest_dir / "export-options.plist"
    payload: dict = {
        "method": "app-store-connect",
        "teamID": team_id,
        "uploadSymbols": True,
        "uploadBitcode": False,
        "destination": "export",
        "stripSwiftSymbols": True,
    }
    profile = _find_distribution_profile(bundle_id)
    if profile is not None:
        uuid, _name = profile
        payload["signingStyle"] = "manual"
        payload["signingCertificate"] = "Apple Distribution"
        payload["provisioningProfiles"] = {bundle_id: uuid}
    else:
        payload["signingStyle"] = "automatic"
    with out.open("wb") as f:
        plistlib.dump(payload, f)
    return out
