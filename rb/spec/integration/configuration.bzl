ENV = select({
    "//rb/spec/integration:chrome": {
        "WD_SPEC_DRIVER": "chrome",
    },
    "//rb/spec/integration:edge": {
        "WD_SPEC_DRIVER": "edge",
    },
    "//rb/spec/integration:firefox": {
        "WD_SPEC_DRIVER": "firefox",
    },
    "//rb/spec/integration:ie": {
        "WD_SPEC_DRIVER": "ie",
    },
    "//rb/spec/integration:safari": {
        "WD_SPEC_DRIVER": "safari",
    },
    "//rb/spec/integration:safari-preview": {
        "WD_SPEC_DRIVER": "safari-preview",
    },
    "//rb/spec/integration:remote-chrome": {
        "WD_REMOTE_BROWSER": "chrome",
        "WD_SPEC_DRIVER": "remote",
    },
    "//rb/spec/integration:remote-edge": {
        "WD_REMOTE_BROWSER": "edge",
        "WD_SPEC_DRIVER": "remote",
    },
    "//rb/spec/integration:remote-firefox": {
        "WD_REMOTE_BROWSER": "firefox",
        "WD_SPEC_DRIVER": "remote",
    },
    "//rb/spec/integration:remote-ie": {
        "WD_REMOTE_BROWSER": "ie",
        "WD_SPEC_DRIVER": "remote",
    },
    "//rb/spec/integration:remote-safari": {
        "WD_REMOTE_BROWSER": "safari",
        "WD_SPEC_DRIVER": "remote",
    },
    "//rb/spec/integration:remote-safari-preview": {
        "WD_REMOTE_BROWSER": "Safari Technology Preview",
        "WD_SPEC_DRIVER": "remote",
    },
    "//conditions:default": {},
})

# We have to use no-sandbox at the moment because Firefox crashes
# when run under sandbox: https://bugzilla.mozilla.org/show_bug.cgi?id=1382498.
# For Chromium-based browser, we can just pass `--no-sandbox` flag.
TAGS = ["no-sandbox"]
