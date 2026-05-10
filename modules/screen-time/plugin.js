const { withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');

const withScreenTime = (config) => {
  // Add FamilyControls entitlement
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.family-controls'] = true;
    return c;
  });

  // Link FamilyControls, ManagedSettings, DeviceActivity frameworks
  config = withXcodeProject(config, (c) => {
    const project = c.modResults;
    const target  = project.getFirstTarget().uuid;
    const frameworks = ['FamilyControls', 'ManagedSettings', 'DeviceActivity'];
    frameworks.forEach(fw => {
      try { project.addFramework(`${fw}.framework`, { target, weak: false }); } catch (_) {}
    });
    return c;
  });

  return config;
};

module.exports = withScreenTime;
