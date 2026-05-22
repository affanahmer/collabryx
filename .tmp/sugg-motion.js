const fs = require("fs");

const file = "components/features/dashboard/suggestions-sidebar.tsx";
let s = fs.readFileSync(file, "utf-8");

// Replace the map line + opening div with motion.div
s = s.replace(
  `{matches.map((match) => (
                                <div`,
  `{matches.map((match, index) => (
                                <motion.div
                                    key={match.id}
                                    initial={prefersReduced ? {} : { opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: prefersReduced ? 0 : index * 0.06, duration: prefersReduced ? 0 : 0.25, ease: "easeOut" }}
                                >
                                <div`
);

// Find the closing </div> patterns and replace the right one with </motion.div>
// The match card closes with: </div> </div> </div> </div> ))}
// The last </div> before ))} is the motion.div close
// Pattern: after </GlassCard> comes </div> (flex wrapper) then </div> (space-y-3) then ))} 
s = s.replace(
  `                                    </GlassCard>
                                </div>
                            </div>
                        ))}`,
  `                                    </GlassCard>
                                </div>
                            </motion.div>
                        ))}`
);

fs.writeFileSync(file, s);
console.log("Done");
