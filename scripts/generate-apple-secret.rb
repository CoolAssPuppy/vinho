require 'jwt'

if ARGV.empty?
  puts "Usage: ruby generate-apple-secret.rb <path-to-p8-file>"
  puts "Example: ruby generate-apple-secret.rb AuthKey_AY25H65TAY.p8"
  exit 1
end

key_file = ARGV[0]

unless File.exist?(key_file)
  puts "Error: File '#{key_file}' not found."
  exit 1
end

team_id = '955GSY56UT'                      # Your Team ID
client_id = 'com.strategicnerds.vinho.web'  # Your Services ID
key_id = 'AY25H65TAY'                       # Your Key ID

ecdsa_key = OpenSSL::PKey::EC.new(File.read(key_file))

headers = {
  'kid' => key_id
}

claims = {
  'iss' => team_id,
  'iat' => Time.now.to_i,
  'exp' => Time.now.to_i + 86400 * 180, # 180 days (max allowed)
  'aud' => 'https://appleid.apple.com',
  'sub' => client_id
}

token = JWT.encode(claims, ecdsa_key, 'ES256', headers)
puts token
