const { withEntitlementsPlist } = require("expo/config-plugins");

// expo-notifications adds aps-environment by default, which requires the
// push notifications capability on the provisioning profile. We only use
// local notifications, so strip it out.
module.exports = function withNoAps(config) {
  return withEntitlementsPlist(config, (cfg) => {
    if (cfg.modResults && "aps-environment" in cfg.modResults) {
      delete cfg.modResults["aps-environment"];
    }
    return cfg;
  });
};
