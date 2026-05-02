#!/usr/bin/env python3
"""
Reorganize edit.html to have:
- Left Column: Basic Information, Amenities & Features
- Right Column: Location Details, Property Rules
"""

# Read the file
with open('client/views/landlord/listings/edit.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the markers
basic_info_end = content.find('</section>\n\n                <!-- Amenities Section -->')
amenities_end = content.find('</section>\n\n                <!-- Property Rules Section -->')
property_rules_start = content.find('<!-- Property Rules Section -->')
property_rules_end = content.find('</section>\n              </div>\n\n              <!-- Right Column -->')
location_end = content.find('</section>\n              </div>\n            </div>\n\n            <!-- Form Actions -->')

if basic_info_end == -1 or amenities_end == -1 or property_rules_start == -1 or property_rules_end == -1 or location_end == -1:
    print("Could not find all markers")
    print(f"basic_info_end: {basic_info_end}")
    print(f"amenities_end: {amenities_end}")
    print(f"property_rules_start: {property_rules_start}")
    print(f"property_rules_end: {property_rules_end}")
    print(f"location_end: {location_end}")
    exit(1)

# Extract the sections
before_amenities = content[:basic_info_end + len('</section>')]
amenities_section = content[basic_info_end + len('</section>\n\n'):amenities_end + len('</section>')]
property_rules_section = content[property_rules_start:property_rules_end + len('</section>')]
right_column_start = content[property_rules_end + len('</section>\n              </div>\n\n'):]
location_section = right_column_start[:right_column_start.find('</section>\n              </div>\n            </div>') + len('</section>')]
after_location = right_column_start[right_column_start.find('</section>\n              </div>\n            </div>'):]

# Reconstruct the file with new order
new_content = (
    before_amenities + '\n\n' +
    amenities_section + '\n' +
    '              </div>\n\n' +
    '              <!-- Right Column -->\n' +
    '              <div class="form-column">\n' +
    '                ' + location_section + '\n\n' +
    '                ' + property_rules_section + '\n' +
    '              </div>\n' +
    '            </div>' +
    after_location[after_location.find('\n\n            <!-- Form Actions -->'):]
)

# Write the file
with open('client/views/landlord/listings/edit.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully reorganized edit.html")
