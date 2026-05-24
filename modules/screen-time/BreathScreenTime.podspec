require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'BreathScreenTime'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = package['license']
  s.platforms      = { ios: '15.1' }
  s.swift_version  = '5.9'
  s.homepage       = 'https://github.com/subrahmanyabhat/breathe-app'
  s.authors        = 'Breathe'
  s.source         = { git: '' }
  s.source_files   = 'ios/*.swift'
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'FamilyControls', 'ManagedSettings', 'DeviceActivity'
end
