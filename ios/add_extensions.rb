#!/usr/bin/env ruby
# Adds BreatheShield and BreatheMonitor extension targets to the Xcode project
require 'xcodeproj'
require 'fileutils'

PROJECT_PATH  = File.join(__dir__, 'Breathe.xcodeproj')
APP_GROUP     = 'group.com.breathex.app'
TEAM_ID       = 'PT83LJRA65'
MAIN_BUNDLE   = 'com.breathex.app'

project = Xcodeproj::Project.open(PROJECT_PATH)
main_target = project.targets.find { |t| t.name == 'Breathe' }

def add_extension_target(project, main_target, name, bundle_suffix, extension_point, source_file, plist_file, entitlements_file, team_id, main_bundle, app_group, extra_frameworks: [])
  # Skip if already exists
  if project.targets.any? { |t| t.name == name }
    puts "#{name} target already exists, skipping"
    return
  end

  # Create target
  target = project.new_target(:app_extension, name, :ios, '16.0')
  target.product_type = 'com.apple.product-type.app-extension'

  # Build configurations
  ['Debug', 'Release'].each do |config_name|
    config = target.build_configurations.find { |c| c.name == config_name }
    next unless config
    config.build_settings.merge!({
      'PRODUCT_NAME'                           => name,
      'PRODUCT_BUNDLE_IDENTIFIER'              => "#{main_bundle}.#{bundle_suffix}",
      'SWIFT_VERSION'                          => '5.9',
      'IPHONEOS_DEPLOYMENT_TARGET'             => '16.0',
      'SKIP_INSTALL'                           => 'YES',
      'DEVELOPMENT_TEAM'                       => team_id,
      'CODE_SIGN_STYLE'                        => 'Automatic',
      'CODE_SIGN_ENTITLEMENTS'                 => "#{name}/#{name}.entitlements",
      'INFOPLIST_FILE'                         => "#{name}/Info.plist",
      'SWIFT_STRICT_CONCURRENCY'               => 'minimal',
      'GENERATE_INFOPLIST_FILE'                => 'NO',
    })
  end

  # Source file group
  main_group = project.main_group
  ext_group = main_group.new_group(name, name)

  # Add source file
  source_ref = ext_group.new_file(File.basename(source_file))
  source_ref.last_known_file_type = 'sourcecode.swift'

  # Add Info.plist
  plist_ref = ext_group.new_file('Info.plist')
  plist_ref.last_known_file_type = 'text.plist.xml'

  # Add entitlements
  ent_ref = ext_group.new_file("#{name}.entitlements")
  ent_ref.last_known_file_type = 'text.plist.entitlements'

  # Add source to compile sources
  target.source_build_phase.add_file_reference(source_ref)

  # Add frameworks
  frameworks_group = project.frameworks_group
  [:FamilyControls, :ManagedSettings, :DeviceActivity].each do |fw|
    fw_name = "#{fw}.framework"
    fw_ref = frameworks_group.new_file(fw_name)
    fw_ref.last_known_file_type = 'wrapper.framework'
    fw_ref.path = fw_name
    fw_ref.source_tree = 'SDKROOT'
    target.frameworks_build_phase.add_file_reference(fw_ref)
  end
  if name == 'BreatheShield'
    fw_name = 'ManagedSettingsUI.framework'
    fw_ref = frameworks_group.new_file(fw_name)
    fw_ref.last_known_file_type = 'wrapper.framework'
    fw_ref.path = fw_name
    fw_ref.source_tree = 'SDKROOT'
    target.frameworks_build_phase.add_file_reference(fw_ref)
  end
  extra_frameworks.each do |fw|
    fw_name = "#{fw}.framework"
    fw_ref = frameworks_group.new_file(fw_name)
    fw_ref.last_known_file_type = 'wrapper.framework'
    fw_ref.path = fw_name
    fw_ref.source_tree = 'SDKROOT'
    target.frameworks_build_phase.add_file_reference(fw_ref)
  end

  # Use the auto-created product reference from new_target (avoids duplicates)
  ext_ref = target.product_reference
  ext_ref.path = "#{name}.appex"
  ext_ref.last_known_file_type = 'wrapper.app-extension'
  ext_ref.explicit_file_type   = 'wrapper.app-extension'
  ext_ref.source_tree = 'BUILT_PRODUCTS_DIR'

  # Add extension to main target's Embed App Extensions phase
  embed_phase = main_target.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
  unless embed_phase
    embed_phase = main_target.new_copy_files_build_phase('Embed Foundation Extensions')
    embed_phase.dst_subfolder_spec = '13' # PlugIns
  end
  embed_file_ref = embed_phase.add_file_reference(ext_ref)
  embed_file_ref.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

  # Add dependency
  main_target.add_dependency(target)

  puts "✓ Added #{name} target"
end

add_extension_target(
  project, main_target,
  'BreatheShield', 'shield',
  'com.apple.familycontrols.shieldconfiguration',
  'BreatheShield/BreatheShieldConfiguration.swift',
  'BreatheShield/Info.plist',
  'BreatheShield/BreatheShield.entitlements',
  TEAM_ID, MAIN_BUNDLE, APP_GROUP
)

add_extension_target(
  project, main_target,
  'BreatheMonitor', 'monitor',
  'com.apple.deviceactivity.device-activity-monitor',
  'BreatheMonitor/BreatheDeviceActivityMonitor.swift',
  'BreatheMonitor/Info.plist',
  'BreatheMonitor/BreatheMonitor.entitlements',
  TEAM_ID, MAIN_BUNDLE, APP_GROUP
)

add_extension_target(
  project, main_target,
  'BreatheReport', 'report',
  'com.apple.deviceactivity.device-activity-report',
  'BreatheReport/BreatheReportExtension.swift',
  'BreatheReport/Info.plist',
  'BreatheReport/BreatheReport.entitlements',
  TEAM_ID, MAIN_BUNDLE, APP_GROUP
)

add_extension_target(
  project, main_target,
  'BreatheShieldAction', 'shieldaction',
  'com.apple.managed-settings.shield-action-service',
  'BreatheShieldAction/BreatheShieldActionExtension.swift',
  'BreatheShieldAction/Info.plist',
  'BreatheShieldAction/BreatheShieldAction.entitlements',
  TEAM_ID, MAIN_BUNDLE, APP_GROUP,
  extra_frameworks: ['UserNotifications']
)

project.save
puts '✓ Project saved'
