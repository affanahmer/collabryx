const fs = require("fs");

// Fix suggestions-sidebar.tsx
let s = fs.readFileSync("components/features/dashboard/suggestions-sidebar.tsx", "utf-8");

// Line after imports: add useReducedMotion hook call
s = s.replace(
  '    // ── API → Cache → Hardcoded Fallback ──',
  '    const prefersReduced = useReducedMotion()\n\n    // ── API → Cache → Hardcoded Fallback ──'
);

// Wrap match cards with motion.div
s = s.replace(
  `                            {matches.map((match) => (`,
  `                            {(prefersReduced ? matches : matches).map((match, index) => (
                                <motion.div
                                    key={match.id}
                                    initial={prefersReduced ? {} : { opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: prefersReduced ? 0 : index * 0.06, duration: prefersReduced ? 0 : 0.25, ease: "easeOut" }}
                                >`
);

// Close motion.div — find the closing pattern of the match card
s = s.replace(
  `                                                </div>
                                            )}
                                        </div>
                                    </GlassCard>
                                </div>
                            </div>
                        ))}`,
  `                                                </div>
                                            )}
                                        </div>
                                    </GlassCard>
                                </div>
                            </motion.div>
                        ))}`
);

// Remove dupe AnchorRight
s = s.replace(
  'See all\n                        <ArrowRight className="h-3 w-3 ml-1" />',
  'See all'
);

fs.writeFileSync("components/features/dashboard/suggestions-sidebar.tsx", s);
console.log("Done: suggestions-sidebar.tsx");
