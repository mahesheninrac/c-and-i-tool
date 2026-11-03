/* Advanced Filter fields per sidebar section (keys = section ids in NAV, common.js). Only the sections that have filters are listed.
   group: { id, title, icon, open, fields[] }
   field: { id, label, type: "radio" | "checkbox" | "select" | "range", options: [[value, label], ...] }
   pop(field)                            -> options open in a small popup (third layer) instead of showing inline
   item(id, label, [fields], { soon })   -> a collapsible filter row holding fields; { soon: true } = "Coming soon"
   Field ids must be unique within a section.
   Values reported by AdvancedFilter.get():  radio/select -> string | null,  checkbox -> string[],  range -> { min, max } */
const FILTER_CONFIG = (() => {
    const slug = (s) =>
        s
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    const pairs = (o) => o.map((x) => (Array.isArray(x) ? x : [x, x]));
    const check = (id, label, o) => ({
        id,
        label,
        type: "checkbox",
        options: pairs(o),
    });
    const radio = (id, label, o, withAny = true) => ({
        id,
        label,
        type: "radio",
        options: (withAny ? [["", "Any"]] : []).concat(pairs(o)),
    });
    const select = (id, label, o) => ({
        id,
        label,
        type: "select",
        options: o,
    });
    const range = (id, label) => ({ id, label, type: "range" });
    const group = (id, title, icon, fields, open = false) => ({
        id,
        title,
        icon,
        open,
        fields,
    });
    const pop = (f) => ({ ...f, popup: true });
    const item = (id, label, fields, opts = {}) => ({
        id,
        label,
        type: "item",
        fields,
        ...opts,
    });

    const STATES = [
        "Andhra Pradesh",
        "Chhattisgarh",
        "Delhi",
        "Gujarat",
        "Haryana",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Tamil Nadu",
        "Telangana",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
    ];
    const WITHIN = [
        ["3m", "Last 3 months"],
        ["6m", "Last 6 months"],
        ["12m", "Last 12 months"],
    ];

    return {
        /* Discover > Explore > C&I Companies */
        entities: [
            group(
                "suggested",
                "Suggested Searches",
                "filter",
                [
                    radio(
                        "suggested",
                        "",
                        [
                            "Energy Intensive heavy ind.",
                            "Process and Chemical ind.",
                            "Discrete Manufacturing",
                            "Textiles and MSME Clusters",
                            "Digital Infrastructure",
                            "Commercial and Institutional",
                        ].map((l) => [slug(l), l]),
                        false,
                    ),
                ],
                true,
            ),

            group("signals", "Signals", "signal", [
                item("demandLoad", "Demand and Load Signals", [
                    range("contractDemand", "Contract demand (kVA)"),
                    range("connectedLoad", "Connected load (kVA)"),
                    pop(
                        check("voltageLevel", "Voltage level", [
                            "LT",
                            "11 kV",
                            "33 kV",
                            "66 kV",
                            "132 kV and above",
                        ]),
                    ),
                    range("loadFactor", "Load factor (%)"),
                    pop(
                        check("shiftPattern", "Shift pattern", [
                            "General (single shift)",
                            "Two shifts",
                            "Three shifts / continuous",
                        ]),
                    ),
                    radio("plants", "Number of plants in India", [
                        "Single",
                        "Multi",
                    ]),
                    radio("capex", "Expansion / Capex plan", ["Yes", "No"]),
                ]),
                item("powerSourcing", "Power Sourcing & Regulatory", [
                    pop(
                        check("currentSource", "Current source of power", [
                            "Grid",
                            "Captive",
                            "RE",
                            "Hybrid",
                        ]),
                    ),
                    pop(check("state", "State", STATES)),
                    range("gridTariff", "Current grid tariff (INR/kWh)"),
                    pop(
                        radio("ppaExpiry", "Existing PPA expiry", [
                            ["6m", "Within 6 months"],
                            ["12m", "Within 12 months"],
                            ["24m", "Within 24 months"],
                            ["gt24", "More than 24 months"],
                        ]),
                    ),
                    pop(
                        check(
                            "procurementRoute",
                            "Preferred procurement route",
                            [
                                "Open access",
                                "Group captive",
                                "Rooftop / on-site",
                                "Green tariff (discom)",
                                "Undecided",
                            ],
                        ),
                    ),
                ]),
                item("financial", "Financial and Credit Signals", [
                    pop(
                        radio("creditRating", "Credit rating", [
                            "Investment grade",
                            "Below investment grade",
                            "Unrated",
                        ]),
                    ),
                    pop(
                        radio("balanceSheet", "Balance sheet strength", [
                            "Strong",
                            "Moderate",
                            "Weak",
                        ]),
                    ),
                    pop(
                        check("parentBacking", "Parent or group backing", [
                            "Listed parent",
                            "Multinational parent",
                            "Standalone",
                        ]),
                    ),
                    pop(
                        radio(
                            "paymentRecord",
                            "Payment track record (discom or earlier supplier)",
                            ["Excellent", "Good", "Delays reported"],
                        ),
                    ),
                    radio(
                        "paymentSecurity",
                        "Willing to give payment security",
                        ["Yes", "No"],
                    ),
                ]),
                item(
                    "sustainability",
                    "Sustainability and Decarbonisation Signals",
                    [
                        pop(
                            check("publicTargets", "Public targets", [
                                "RE100",
                                "SBTi",
                                "Net-zero target year",
                                "Internal RE share goal",
                            ]),
                        ),
                        pop(
                            check("disclosures", "Disclosures", [
                                "BRSR",
                                "CDP score",
                                "Scope 2 emissions",
                            ]),
                        ),
                        radio(
                            "supplyChainMandate",
                            "Customer supply-chain mandates",
                            ["Yes", "No"],
                        ),
                    ],
                ),
                item("intent", "Intent and Trigger Events", [
                    pop(
                        radio(
                            "capexAnnounced",
                            "New plant, expansion or capex announced",
                            WITHIN,
                        ),
                    ),
                    radio(
                        "rfp",
                        "Published RFPs (requests for proposal), EOIs (expressions of interest) or tenders for RE",
                        ["Yes", "No"],
                    ),
                    radio("pastDeals", "Past deals with competitors", [
                        "Yes",
                        "No",
                    ]),
                ]),
            ]),

            group("grid", "Grid and Connectivity", "bolt", [
                pop(
                    check(
                        "connectionVoltage",
                        "Connection voltage & substation",
                        ["11 kV", "33 kV", "66 kV", "132 kV and above"],
                    ),
                ),
                pop(
                    radio(
                        "contractDemandMin",
                        "Contract demand vs state-specific minimum",
                        ["Meets state minimum", "Below state minimum"],
                    ),
                ),
                pop(
                    radio(
                        "gridCongestion",
                        "Local grid congestion & transmission corridors",
                        ["Low", "Medium", "High"],
                    ),
                ),
                pop(
                    check("metering", "Metering readiness", [
                        "ABT-compliant meters",
                        "Time-block data available",
                    ]),
                ),
            ]),

            group("tariff", "Tariff and Savings", "scale", [
                item("htTariff", "Current HT tariff", [
                    range("energyCharge", "Energy charge (INR/kWh)"),
                    range("demandCharge", "Demand charge (INR/kVA/month)"),
                ]),
                range(
                    "landedRE",
                    "Landed cost of RE after O/A charges (INR/kWh)",
                ),
                pop(
                    check("banking", "Banking provisions & settlement rules", [
                        "Monthly banking",
                        "Annual banking",
                        "Time-of-day banking",
                        "No banking",
                    ]),
                ),
                pop(radio("tariffRevision", "Recent tariff revisions", WITHIN)),
                range("costGap", "Landed cost gap vs utility tariff (INR/kWh)"),
            ]),

            group("loadShape", "Load Shape and Firmness", "chart", [
                range("loadFactorShape", "Load factor (%)"),
                range("nightShare", "Night and evening consumption share (%)"),
                pop(
                    check("seasonality", "Seasonality & shutdown periods", [
                        "Seasonal load",
                        "Annual maintenance shutdown",
                        "No significant seasonality",
                    ]),
                ),
                item("dgDependence", "DG sets dependence", [
                    range("outageHours", "Power outages (hours per month)"),
                ]),
                radio(
                    "multiSite",
                    "Multi-site load that can be put under one structure",
                    ["Yes", "No"],
                ),
            ]),

            group("market", "Competitive and Market Positioning", "users", [
                pop(
                    check(
                        "supplierRelationship",
                        "Existing supplier or developer relationship",
                        ["Existing supplier", "SLA terms in place"],
                    ),
                ),
                pop(
                    radio(
                        "clusterDeals",
                        "Recent deals by the same cluster",
                        WITHIN,
                    ),
                ),
                pop(
                    check("negotiation", "Negotiation pattern", [
                        "Competitive bids",
                        "Bilateral",
                    ]),
                ),
                radio("aggregator", "Aggregator involvement", ["Yes", "No"]),
            ]),
        ],

        /* Discover > Explore > Sites / Facilities */
        sites: [
            group(
                "sites",
                "Sites / Facilities",
                "building",
                [
                    pop(
                        check("powerMix", "Power source mix", [
                            "Grid",
                            "Captive",
                            "RE",
                            "Hybrid",
                        ]),
                    ),
                    pop(
                        check("oaStatus", "O/A status", [
                            "Availed",
                            "Eligible",
                            "Non-eligible",
                            "Unknown",
                        ]),
                    ),
                    pop(
                        check("infraReq", "Infra requirement", [
                            "Dedicated substation",
                            "Feeder upgrade",
                            "None",
                        ]),
                    ),
                    item("ehvDistance", "Distance to EHV substation (km)", [
                        range("ehvDistance", "km"),
                    ]),
                    item("dgBackup", "DG backup extent (kVA)", [
                        range("dgBackup", "kVA"),
                    ]),
                    item("powerCut", "Average power cut (hours)", [
                        select("cutPeriod", "Period", [
                            ["", "Per month / per year"],
                            ["month", "Per month"],
                            ["year", "Per year"],
                        ]),
                        range("cutHours", "Hours"),
                    ]),
                    item(
                        "wapc",
                        "Weighted average power cost (INR/kWh)",
                        [range("wapc", "INR/kWh")],
                        { soon: true },
                    ),
                    pop(
                        check("creditRating", "Credit rating (rating agency)", [
                            "AAA",
                            "AA",
                            "A",
                            "BBB",
                            "BB and below",
                            "Unrated",
                        ]),
                    ),
                    radio("plants", "No. of plants in India", [
                        "Single",
                        "Multi",
                    ]),
                    pop(
                        radio("ppaExpiry", "PPA expiry window", [
                            ["6m", "Within 6 months"],
                            ["12m", "Within 12 months"],
                            ["24m", "Within 24 months"],
                            ["gt24", "More than 24 months"],
                        ]),
                    ),
                    radio("capex", "Expansion / CAPEX plan", ["Yes", "No"]),
                ],
                true,
            ),
        ],
    };
})();