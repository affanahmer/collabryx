const fs = require('fs');
const path = require('path');

// Fix feed.tsx — the post-item replacement
const feedPath = path.join(__dirname, '..', 'components', 'features', 'dashboard', 'feed.tsx');
let feed = fs.readFileSync(feedPath, 'utf-8');

// Check what we have
const hasMotionDiv = feed.includes('<motion.div');
const hasMotionDivClose = feed.includes('</motion.div>');

if (hasMotionDiv && !hasMotionDivClose) {
  // Find the closing </div> for the post wrapper
  // The pattern is: after </PostCard> there's </div> (the relative wrapper)
  // And then ")" ")" ")"
  // We need to find the right </div> to close motion.div

  // Strategy: find the first </div> after sorting is done  
  const marker = '</PostCard>\n                                    </div>\n                                </div>\n                        )\n                    })';
  const markerNew = '</PostCard>\n                                    </div>\n                                </motion.div>\n                        )\n                    })';
  feed = feed.replace(marker, markerNew);
}

fs.writeFileSync(feedPath, feed, 'utf-8');

// Fix suggestions-sidebar.tsx
const suggPath = path.join(__dirname, '..', 'components', 'features', 'dashboard', 'suggestions-sidebar.tsx');
let sugg = fs.readFileSync(suggPath, 'utf-8');

// Remove any broken motion.div that's open but not closed
// Find and fix the match card replacement
const suggMarker = '</motion.div>\n                        ))}';
const suggHasClose = sugg.includes(suggMarker);

if (sugg.includes('<motion.div') && !suggHasClose) {
  // The closing was wrong. Let's find the right pattern.
  // Look for where match cards iteration ends
  const endPattern = '                                    </GlassCard>\n                                </div>\n                            </div>\n                        ))}';
  const endPatternFixed = '                                    </GlassCard>\n                                </div>\n                            </motion.div>\n                        ))}';
  sugg = sugg.replace(endPattern, endPatternFixed);
}

fs.writeFileSync(suggPath, sugg, 'utf-8');

console.log('Fixed feed.tsx JSX nesting');
console.log('Fixed suggestions-sidebar.tsx JSX nesting');
