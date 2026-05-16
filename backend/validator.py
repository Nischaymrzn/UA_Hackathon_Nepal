"""UAReady core validation engine — RFC 6531 | RFC 6532 | IDNA2008 | UTS#46 | UTS#15"""

import unicodedata
import re

# ═══ ADAPTER LAYER ═══

MAX_LOCAL_BYTES  = 64
MAX_EMAIL_BYTES  = 254
MAX_DOMAIN_CHARS = 253
MAX_LABEL_CHARS  = 63

SCRIPT_RANGES = {
    "Devanagari": (0x0900, 0x097F),
    "Arabic":     (0x0600, 0x06FF),
    "Latin":      (0x0041, 0x007A),
    "Chinese":    (0x4E00, 0x9FFF),
    "Cyrillic":   (0x0400, 0x04FF),
    "Tamil":      (0x0B80, 0x0BFF),
}

try:
    import idna as _idna
    def _label_to_ace(label: str) -> str:
        try:
            return _idna.encode(label, alts=None).decode("ascii")
        except Exception:
            try:
                return label.encode("idna").decode("ascii")
            except Exception:
                return label
except ImportError:
    def _label_to_ace(label: str) -> str:
        try:
            return label.encode("idna").decode("ascii")
        except Exception:
            return label


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def utf8_bytes(text: str) -> int:
    return len(text.encode("utf-8"))


def detect_scripts(text: str) -> list:
    found = set()
    for ch in text:
        cp = ord(ch)
        for name, (lo, hi) in SCRIPT_RANGES.items():
            if lo <= cp <= hi:
                found.add(name)
    return sorted(found)


def domain_to_ace(domain: str) -> str:
    if not domain:
        return domain
    labels = domain.split(".")
    ace_labels = []
    for lbl in labels:
        if not lbl:
            ace_labels.append(lbl)
            continue
        try:
            ace = _label_to_ace(lbl)
        except Exception:
            ace = lbl
        ace_labels.append(ace)
    return ".".join(ace_labels)


def has_control_chars(text: str) -> bool:
    for ch in text:
        cat = unicodedata.category(ch)
        if cat in ("Cc", "Cf") and ch not in ("\t",):
            return True
    return False


# ═══ INSPECTOR LAYER ═══

def _inspect_domain(domain: str):
    issues   = []
    warnings = []
    standards = {"RFC 1035"}
    is_idn = False

    if not domain:
        issues.append("Domain is empty — RFC 1035")
        return issues, warnings, standards, is_idn, ""

    domain = nfc(domain.strip())

    if len(domain) > MAX_DOMAIN_CHARS:
        issues.append(f"Domain exceeds {MAX_DOMAIN_CHARS} characters — RFC 1035 §2.3.4")

    labels = domain.split(".")
    if len(labels) < 2:
        issues.append("Domain must contain at least one dot — RFC 1035 §2.3.1")

    ace_labels = []
    for i, label in enumerate(labels):
        if label == "":
            issues.append(f"Empty label at position {i} (consecutive dots) — RFC 1035 §2.3.1")
            ace_labels.append("")
            continue

        if len(label) > MAX_LABEL_CHARS:
            issues.append(f"Label '{label[:20]}…' exceeds {MAX_LABEL_CHARS} chars — RFC 1035 §2.3.4")

        if label.startswith("-"):
            issues.append(f"Label '{label}' starts with hyphen — RFC 5891 §4.2.3")
            standards.add("RFC 5891")
        if label.endswith("-"):
            issues.append(f"Label '{label}' ends with hyphen — RFC 5891 §4.2.3")
            standards.add("RFC 5891")

        is_ascii = all(ord(c) < 128 for c in label)
        if is_ascii:
            if not re.match(r'^[A-Za-z0-9\-]+$', label):
                issues.append(f"ASCII label '{label}' contains non-LDH character — RFC 5891 §4.2")
                standards.add("RFC 5891")
            ace_labels.append(label)
        else:
            is_idn = True
            standards.update({"RFC 5891", "UTS#46", "UTS#15"})
            if has_control_chars(label):
                issues.append(f"Label '{label}' contains control/format characters — RFC 5891 §4.2")
            ace = _label_to_ace(label)
            if ace.lower().startswith("xn--"):
                warnings.append(f"Label '{label}' encoded as ACE '{ace}' — RFC 5891 §4.1")
            ace_labels.append(ace)

    return issues, warnings, standards, is_idn, ".".join(ace_labels)


def _inspect_email(email: str):
    issues   = []
    warnings = []
    standards = {"RFC 5321", "RFC 6531"}
    is_eai = False
    is_idn = False
    local_part   = ""
    domain_part  = ""
    ace_form     = ""

    if not email:
        issues.append("Email is empty — RFC 5321 §4.5.3")
        return issues, warnings, standards, is_eai, is_idn, local_part, domain_part, ace_form

    email = nfc(email.strip())

    total_bytes = utf8_bytes(email)
    if total_bytes > MAX_EMAIL_BYTES:
        issues.append(f"Email exceeds {MAX_EMAIL_BYTES} UTF-8 bytes ({total_bytes}) — RFC 5321 §4.5.3")

    at_positions = [i for i, c in enumerate(email) if c == "@"]

    if not at_positions:
        issues.append("Missing @ sign — RFC 5321 §4.1.2")
        return issues, warnings, sorted(standards), is_eai, is_idn, local_part, domain_part, ace_form

    if len(at_positions) > 1:
        issues.append(f"Multiple @ signs ({len(at_positions)}) — RFC 6531 §3.3 specifies split at last @")

    last_at     = at_positions[-1]
    local_part  = email[:last_at]
    domain_part = email[last_at + 1:]

    if not local_part:
        issues.append("Local part is empty — RFC 5321 §4.1.2")

    local_bytes = utf8_bytes(local_part)
    if local_bytes > MAX_LOCAL_BYTES:
        issues.append(f"Local part exceeds {MAX_LOCAL_BYTES} UTF-8 bytes ({local_bytes}) — RFC 5321 §4.5.3")

    if local_part.startswith("."):
        issues.append("Local part starts with dot — RFC 5321 §4.1.2")
    if local_part.endswith("."):
        issues.append("Local part ends with dot — RFC 5321 §4.1.2")
    if ".." in local_part:
        issues.append("Local part contains consecutive dots — RFC 5321 §4.1.2")
    if has_control_chars(local_part):
        issues.append("Local part contains control characters — RFC 5321 §4.1.2")

    if any(ord(c) > 127 for c in local_part):
        is_eai = True
        standards.update({"RFC 6531", "RFC 6532"})

    d_issues, d_warnings, d_standards, is_idn, ace_form = _inspect_domain(domain_part)
    issues.extend(d_issues)
    warnings.extend(d_warnings)
    standards.update(d_standards)

    return issues, warnings, standards, is_eai, is_idn, local_part, domain_part, ace_form


# ═══ MESSENGER LAYER ═══

def validate_email(raw: str) -> dict:
    try:
        normalized = nfc(raw.strip()) if raw else ""
        issues, warnings, standards, is_eai, is_idn, local_part, domain_part, ace_form = (
            _inspect_email(normalized)
        )
        scripts    = detect_scripts(normalized)
        local_bytes = utf8_bytes(local_part) if local_part else 0
        total_bytes = utf8_bytes(normalized) if normalized else 0
        return {
            "valid":    len(issues) == 0,
            "issues":   issues,
            "warnings": warnings,
            "standards": sorted(standards),
            "info": {
                "normalized":  normalized,
                "aceForm":     f"{local_part}@{ace_form}" if ace_form else normalized,
                "scripts":     scripts,
                "localBytes":  local_bytes,
                "totalBytes":  total_bytes,
                "isEAI":       is_eai,
                "isIDN":       is_idn,
            },
        }
    except Exception as exc:
        return {
            "valid": False,
            "issues": [f"Internal error: {exc}"],
            "warnings": [],
            "standards": [],
            "info": {},
        }


def validate_domain(raw: str) -> dict:
    try:
        normalized = nfc(raw.strip()) if raw else ""
        issues, warnings, standards, is_idn, ace_form = _inspect_domain(normalized)
        scripts    = detect_scripts(normalized)
        total_bytes = utf8_bytes(normalized) if normalized else 0
        return {
            "valid":    len(issues) == 0,
            "issues":   issues,
            "warnings": warnings,
            "standards": sorted(standards),
            "info": {
                "normalized": normalized,
                "aceForm":    ace_form,
                "scripts":    scripts,
                "totalBytes": total_bytes,
                "isIDN":      is_idn,
            },
        }
    except Exception as exc:
        return {
            "valid": False,
            "issues": [f"Internal error: {exc}"],
            "warnings": [],
            "standards": [],
            "info": {},
        }


# ── Embedded test suite ───────────────────────────────────────────────────────

_TEST_CASES = [
    {"kind": "email",  "input": "राम@नेपाल.नेपाल",       "expectValid": True,  "desc": "Devanagari EAI email with .नेपाल ccTLD"},
    {"kind": "email",  "input": "user@example.com",        "expectValid": True,  "desc": "Plain ASCII email"},
    {"kind": "email",  "input": "سارة@مثال.إختبار",        "expectValid": True,  "desc": "Arabic EAI email"},
    {"kind": "email",  "input": "用户@例子.广告",            "expectValid": True,  "desc": "Chinese EAI email"},
    {"kind": "email",  "input": "test+tag@subdomain.io",   "expectValid": True,  "desc": "ASCII email with plus tag"},
    {"kind": "email",  "input": "@नेपाल.नेपाल",            "expectValid": False, "desc": "Empty local part"},
    {"kind": "email",  "input": "user@@example.com",       "expectValid": False, "desc": "Double @ sign"},
    {"kind": "email",  "input": ".user@example.com",       "expectValid": False, "desc": "Local part starts with dot"},
    {"kind": "email",  "input": "user@",                   "expectValid": False, "desc": "Empty domain"},
    {"kind": "email",  "input": "a" * 65 + "@example.com", "expectValid": False, "desc": "Local part > 64 bytes"},
    {"kind": "domain", "input": "नेपाल.नेपाल",             "expectValid": True,  "desc": "Devanagari IDN domain (.नेपाल ccTLD)"},
    {"kind": "domain", "input": "example.com",             "expectValid": True,  "desc": "Plain ASCII domain"},
    {"kind": "domain", "input": "مثال.إختبار",              "expectValid": True,  "desc": "Arabic IDN domain"},
    {"kind": "domain", "input": "例子.广告",                 "expectValid": True,  "desc": "Chinese IDN domain"},
    {"kind": "domain", "input": "sub.domain.org",          "expectValid": True,  "desc": "Multi-label ASCII domain"},
    {"kind": "domain", "input": "",                        "expectValid": False, "desc": "Empty domain"},
    {"kind": "domain", "input": "-bad.com",                "expectValid": False, "desc": "Label starts with hyphen"},
    {"kind": "domain", "input": "has..dots.com",           "expectValid": False, "desc": "Consecutive dots (empty label)"},
    {"kind": "domain", "input": "a" * 64 + ".com",        "expectValid": False, "desc": "Label > 63 chars"},
    {"kind": "domain", "input": "nodot",                   "expectValid": False, "desc": "Single label — no dot"},
]


def run_tests() -> dict:
    results = []
    passed  = 0
    for tc in _TEST_CASES:
        r   = validate_email(tc["input"]) if tc["kind"] == "email" else validate_domain(tc["input"])
        got = r["valid"]
        ok  = got == tc["expectValid"]
        if ok:
            passed += 1
        results.append({
            "kind":        tc["kind"],
            "input":       tc["input"],
            "expectValid": tc["expectValid"],
            "got":         got,
            "pass":        ok,
            "desc":        tc["desc"],
        })
    return {
        "results": results,
        "passed":  passed,
        "total":   len(_TEST_CASES),
        "score":   f"{passed}/{len(_TEST_CASES)}",
    }
