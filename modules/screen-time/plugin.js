const { withInfoPlist, withEntitlementsPlist } = require('@expo/config-plugins');

// Expo config plugin to add FamilyControls entitlement
const withScreenTime = (config) => {
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.family-controls'] = true;
    return c;
  });
  return config;
};

module.exports = withScreenTime;
