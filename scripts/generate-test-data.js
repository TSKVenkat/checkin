const fs = require('fs');
const path = require('path');
const { format, addDays, subDays, subMonths } = require('date-fns');

// Create scripts directory if it doesn't exist
const scriptsDir = path.join(__dirname);
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Create output directory for CSV files
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Also copy files to the templates directory for easy access
const templatesDir = path.join(__dirname, '..', 'public', 'templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Helper to write CSV file
function writeCSV(filename, headers, data) {
  // Handle quotes for CSV compatibility
  const escapedData = data.map(row => 
    row.map(item => {
      // If the item contains a comma, quote, or newline, wrap it in quotes
      if (typeof item === 'string' && (item.includes(',') || item.includes('"') || item.includes('\n'))) {
        // Replace any quotes with double quotes for escaping
        return `"${item.replace(/"/g, '""')}"`;
      }
      return item;
    })
  );
  
  const csvContent = [
    headers.join(','),
    ...escapedData.map(row => row.join(','))
  ].join('\n');
  
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, csvContent);
  console.log(`Generated ${filePath}`);
  
  // Also copy to templates directory
  const templatePath = path.join(templatesDir, filename);
  fs.writeFileSync(templatePath, csvContent);
  console.log(`Copied to ${templatePath}`);
}

// Generate a small set of attendees data (30 records)
function generateAttendees() {
  // Based on our attendees-template.csv
  const headers = ['name', 'email', 'phone', 'role', 'company', 'title', 'registrationDate', 'tags', 'notes', 'eventId'];
  const attendeeRoles = ['Regular', 'VIP', 'Speaker', 'Sponsor', 'Staff'];
  const companies = ['Acme Inc.', 'TechCorp', 'GlobalSoft', 'InnovateCo', 'FutureTech', 'MediaWorks', 'DevWorld'];
  const titles = ['Software Engineer', 'Product Manager', 'Designer', 'CEO', 'CTO', 'Marketing Director', 'Sales Manager'];
  // Use specific event ID for all attendees
  const eventId = '5b6a8b3e-5510-40cc-b961-aade214524f8';
  const tags = ['tech', 'marketing', 'design', 'business', 'leadership', 'engineering', 'product', 'sales', 'vip', 'speaker'];
  
  const attendees = [];
  
  // First add Mohana as requested (first attendee)
  const firstName = 'Mohana';
  const lastName = 'Kam';
  const name = `${firstName} ${lastName}`;
  const email = 'mohana.kam@gmail.com';
  const phone = '+1' + Math.floor(1000000000 + Math.random() * 9000000000);
  const company = 'CheckIn Technologies';
  const title = 'Software Engineer';
  const role = 'VIP'; // Make this a VIP
  
  // Generate registration date within the last month
  const today = new Date();
  const oneMonthAgo = subMonths(today, 1);
  const registrationDate = format(
    new Date(oneMonthAgo.getTime() + Math.random() * (today.getTime() - oneMonthAgo.getTime())),
    'yyyy-MM-dd'
  );
  
  // Add special tags for this user
  const attendeeTags = ['vip', 'tech', 'engineering'];
  
  // Add a note
  const note = 'Special attendee, ensure priority check-in';
  
  attendees.push([
    name,                   // Required: Full name
    email,                  // Required: Email
    phone,                  // Required: Phone
    role,                   // Required: Role
    company,                // Optional: Company
    title,                  // Optional: Title
    registrationDate,       // Optional: Registration date
    attendeeTags.join(','), // Optional: Tags
    note,                   // Optional: Notes
    eventId                 // Required: EventId - using the specific ID
  ]);
  
  // Generate remaining attendees (24 more)
  for (let i = 1; i <= 24; i++) {
    const firstName = `First${i}`;
    const lastName = `Last${i}`;
    const name = `${firstName} ${lastName}`;
    const email = `attendee${i}@example.com`;
    const phone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const company = companies[Math.floor(Math.random() * companies.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const role = attendeeRoles[Math.floor(Math.random() * attendeeRoles.length)];
    
    // Generate registration date within the last month
    const registrationDate = format(
      new Date(oneMonthAgo.getTime() + Math.random() * (today.getTime() - oneMonthAgo.getTime())),
      'yyyy-MM-dd'
    );
    
    // Randomly assign 1-3 tags
    const numTags = Math.floor(1 + Math.random() * 3);
    const attendeeTags = [];
    for (let j = 0; j < numTags; j++) {
      const tag = tags[Math.floor(Math.random() * tags.length)];
      if (!attendeeTags.includes(tag)) {
        attendeeTags.push(tag);
      }
    }
    
    // Generate a random note for some attendees
    const hasNote = Math.random() > 0.7;
    const note = hasNote 
      ? `Notes for ${name}: ${['Special dietary requirements', 'Requires accessibility assistance', 'First-time attendee', 'Speaking at session #' + Math.floor(Math.random() * 10), 'Previous sponsor'][Math.floor(Math.random() * 5)]}`
      : '';
    
    attendees.push([
      name,                   // Required: Full name
      email,                  // Required: Email
      phone,                  // Required: Phone
      role,                   // Required: Role
      company,                // Optional: Company
      title,                  // Optional: Title
      registrationDate,       // Optional: Registration date
      attendeeTags.join(','), // Optional: Tags
      note,                   // Optional: Notes
      eventId                 // Required: EventId - using the specific ID
    ]);
  }
  
  // Add 5 duplicate entries to test duplicate detection
  for (let i = 1; i <= 5; i++) {
    const sourceIndex = Math.floor(Math.random() * 20);
    const source = [...attendees[sourceIndex]];
    
    // Make small changes to simulate manual entry errors
    const changeType = Math.floor(Math.random() * 3);
    
    if (changeType === 0) {
      // Change name case but use same email (which is the unique identifier)
      source[0] = source[0].toUpperCase();
    } else if (changeType === 1) {
      // Change phone formatting but use same email
      source[2] = source[2].replace('+1', '').replace(/(\d{3})(\d{3})(\d{4})/, '+1-$1-$2-$3');
    } else {
      // Change company or title but keep core data the same
      source[4] = companies[Math.floor(Math.random() * companies.length)];
      source[5] = titles[Math.floor(Math.random() * titles.length)];
    }
    
    attendees.push(source);
  }
  
  writeCSV('attendees.csv', headers, attendees);
  return attendees;
}

// Generate staff data (30 records)
function generateStaff() {
  // Based on our staff-template.csv
  const headers = ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'department', 'hireDate', 'permissions'];
  const roles = ['admin', 'manager', 'staff', 'support'];
  const departments = ['Operations', 'Registration', 'Technical Support', 'Customer Service', 'Security'];
  const permissions = [
    'admin,user_manage,event_manage',
    'event_manage,attendee_manage',
    'basic,attendee_checkin',
    'reports_view,dashboard_view',
    'resource_manage,attendee_checkin'
  ];
  
  const staff = [];
  // Generate 25 staff members
  for (let i = 1; i <= 25; i++) {
    const firstName = `Staff${i}`;
    const lastName = `Member${i}`;
    const email = `staff${i}@example.com`;
    const phone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const role = roles[Math.floor(Math.random() * roles.length)];
    const department = departments[Math.floor(Math.random() * departments.length)];
    
    // Generate hire date within the last year
    const today = new Date();
    const oneYearAgo = subMonths(today, 6);
    const hireDate = format(
      new Date(oneYearAgo.getTime() + Math.random() * (today.getTime() - oneYearAgo.getTime())),
      'yyyy-MM-dd'
    );
    
    // Assign permissions based on role
    let permission;
    if (role === 'admin') {
      permission = permissions[0];
    } else if (role === 'manager') {
      permission = permissions[1];
    } else if (role === 'staff') {
      permission = permissions[2];
    } else {
      permission = permissions[Math.floor(Math.random() * permissions.length)];
    }
    
    staff.push([
      `staff_${i}`,
      firstName,
      lastName,
      email,
      phone,
      role,
      department,
      hireDate,
      permission
    ]);
  }
  
  // Add 5 duplicate entries with different formatting to test duplicate detection
  for (let i = 1; i <= 5; i++) {
    const sourceIndex = Math.floor(Math.random() * 20);
    const source = [...staff[sourceIndex]];
    
    // Make small changes to simulate manual entry errors
    const changeType = Math.floor(Math.random() * 3);
    
    if (changeType === 0) {
      // Add trailing space to first name
      source[1] = source[1] + ' ';
    } else if (changeType === 1) {
      // Change phone formatting
      source[4] = source[4].replace('+1', '').replace(/(\d{3})(\d{3})(\d{4})/, '+1-$1-$2-$3');
    } else {
      // Change department spelling but keep the same ID and email
      source[6] = source[6].toLowerCase();
    }
    
    staff.push(source);
  }
  
  writeCSV('staff.csv', headers, staff);
  return staff;
}

// Generate events data (30 records)
function generateEvents() {
  // Based on our events-template.csv
  const headers = ['id', 'name', 'description', 'startDate', 'endDate', 'location', 'capacity', 'type', 'status', 'timezone', 'isPublic', 'organizer'];
  const locations = ['Convention Center', 'Grand Hotel', 'Tech Campus', 'Downtown Arena', 'University Hall', 'Business Park'];
  const eventTypes = ['Conference', 'Workshop', 'Seminar', 'Product Launch', 'Networking', 'Training', 'Hackathon'];
  const statuses = ['draft', 'upcoming', 'active', 'completed', 'cancelled'];
  const timezones = ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Phoenix', 'Europe/London', 'Asia/Tokyo'];
  const organizers = ['TechOrg Inc.', 'Dev Community', 'Product Team', 'Marketing Department', 'Innovation Lab', 'Education Center'];
  
  const events = [];
  
  // First event with specific ID as requested
  const requiredEventId = '5b6a8b3e-5510-40cc-b961-aade214524f8';
  const name = `Main Event: ${eventTypes[Math.floor(Math.random() * eventTypes.length)]}`;
  const description = `This is the main conference event. The event will cover various topics related to technology and innovation.`;
  
  // Generate dates - make this event active (current)
  const today = new Date();
  const startDate = format(subDays(today, 1), 'yyyy-MM-dd');
  const endDate = format(addDays(today, 3), 'yyyy-MM-dd');
  
  const location = locations[Math.floor(Math.random() * locations.length)];
  const capacity = 500;
  const type = 'Conference';
  const status = 'active'; // Make sure it's active
  const timezone = timezones[Math.floor(Math.random() * timezones.length)];
  const isPublic = 'true';
  const organizer = organizers[Math.floor(Math.random() * organizers.length)];
  
  events.push([
    requiredEventId,
    name,
    description,
    startDate,
    endDate,
    location,
    capacity,
    type,
    status,
    timezone,
    isPublic,
    organizer
  ]);
  
  // Generate remaining events
  for (let i = 1; i <= 24; i++) {
    const name = `Event ${i}: ${eventTypes[Math.floor(Math.random() * eventTypes.length)]}`;
    const description = `This is a description for event ${i}. The event will cover various topics related to technology and innovation.`;
    
    // Generate start date within next 2 months, some in the past month
    const today = new Date();
    const twoMonthsLater = addDays(today, 60);
    const oneMonthAgo = subDays(today, 30);
    const startDate = format(
      new Date(oneMonthAgo.getTime() + Math.random() * (twoMonthsLater.getTime() - oneMonthAgo.getTime())),
      'yyyy-MM-dd'
    );
    
    // End date 1-5 days after start date
    const start = new Date(startDate);
    const endDate = format(
      addDays(start, 1 + Math.floor(Math.random() * 5)),
      'yyyy-MM-dd'
    );
    
    const location = locations[Math.floor(Math.random() * locations.length)];
    const capacity = Math.floor(100 + Math.random() * 900);
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    // Set status based on start and end dates
    let status;
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (startDateObj > today) {
      status = 'upcoming';
    } else if (startDateObj <= today && endDateObj >= today) {
      status = 'active';
    } else {
      status = 'completed';
    }
    
    // Override some statuses for variety
    if (Math.random() > 0.8) {
      status = Math.random() > 0.5 ? 'draft' : 'cancelled';
    }
    
    const timezone = timezones[Math.floor(Math.random() * timezones.length)];
    const isPublic = Math.random() > 0.3 ? 'true' : 'false';
    const organizer = organizers[Math.floor(Math.random() * organizers.length)];
    
    events.push([
      `evt_${i}`,
      name,
      description,
      startDate,
      endDate,
      location,
      capacity,
      type,
      status,
      timezone,
      isPublic,
      organizer
    ]);
  }
  
  // Add 5 duplicate events with slight variations to test duplicate detection
  for (let i = 1; i <= 5; i++) {
    const sourceIndex = Math.floor(Math.random() * 20);
    const source = [...events[sourceIndex]];
    
    // Make small changes to simulate manual entry errors
    const changeType = Math.floor(Math.random() * 3);
    
    if (changeType === 0) {
      // Change status only
      source[8] = statuses[Math.floor(Math.random() * statuses.length)];
    } else if (changeType === 1) {
      // Change capacity
      source[6] = parseInt(source[6]) + 50;
    } else {
      // Change description formatting
      source[2] = source[2].replace('.', '. ').trim();
    }
    
    events.push(source);
  }
  
  writeCSV('events.csv', headers, events);
  return events;
}

// Generate resources data (30 records)
function generateResources() {
  // Based on our resources-template.csv
  const headers = ['id', 'name', 'description', 'type', 'eventId', 'quantity', 'isLimited', 'claimableBy'];
  const resourceTypes = ['kit', 'lunch', 'badge', 'materials', 'swag', 'access', 'certificate'];
  const claimableBy = ['All', 'VIP', 'Speaker', 'Staff', 'Sponsor'];
  // Use our specific event ID for most resources
  const mainEventId = '5b6a8b3e-5510-40cc-b961-aade214524f8';
  const otherEventIds = Array.from({ length: 24 }, (_, i) => `evt_${i + 1}`);
  
  const resources = [];
  // Generate 25 resources
  for (let i = 1; i <= 25; i++) {
    const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
    
    // Generate appropriate name based on resource type
    let name;
    let description;
    
    switch (resourceType) {
      case 'kit':
        name = `Welcome Kit ${i}`;
        description = `Conference welcome kit with notebook, pen, and branded swag`;
        break;
      case 'lunch':
        name = `Lunch Voucher Day ${i % 5 + 1}`;
        description = `Meal voucher valid for lunch on day ${i % 5 + 1} of the event`;
        break;
      case 'badge':
        name = `${['Regular', 'VIP', 'Speaker', 'Staff'][i % 4]} Badge`;
        description = `Access badge for ${['Regular', 'VIP', 'Speaker', 'Staff'][i % 4]} attendees`;
        break;
      case 'materials':
        name = `Workshop Materials Set ${i}`;
        description = `Printed materials and digital resources for workshop sessions`;
        break;
      case 'swag':
        name = `${['T-Shirt', 'Water Bottle', 'Tote Bag', 'Notebook'][i % 4]} ${i}`;
        description = `Event branded ${['T-Shirt', 'Water Bottle', 'Tote Bag', 'Notebook'][i % 4]}`;
        break;
      case 'access':
        name = `${['VIP Lounge', 'After Party', 'Networking Session', 'Special Workshop'][i % 4]} Access`;
        description = `Access pass for the ${['VIP Lounge', 'After Party', 'Networking Session', 'Special Workshop'][i % 4]}`;
        break;
      default:
        name = `Resource ${i}`;
        description = `Generic resource ${i} for the event`;
    }
    
    // Assign most resources to our main event ID
    const eventId = i <= 15 ? mainEventId : otherEventIds[Math.floor(Math.random() * otherEventIds.length)];
    
    const quantity = Math.floor(50 + Math.random() * 200);
    const isLimited = resourceType === 'lunch' || resourceType === 'access' || Math.random() > 0.5 ? 'true' : 'false';
    
    // Assign appropriate claimable by based on resource type
    let claimableByValue;
    if (resourceType === 'badge' || resourceType === 'kit') {
      claimableByValue = 'All';
    } else if (resourceType === 'access' && name.includes('VIP')) {
      claimableByValue = 'VIP';
    } else if (resourceType === 'materials' && name.includes('Workshop')) {
      claimableByValue = Math.random() > 0.5 ? 'All' : 'Speaker';
    } else {
      claimableByValue = claimableBy[Math.floor(Math.random() * claimableBy.length)];
    }
    
    resources.push([
      `res_${i}`,
      name,
      description,
      resourceType,
      eventId,
      quantity,
      isLimited,
      claimableByValue
    ]);
  }
  
  // Add 5 duplicate resources to test duplicate detection
  for (let i = 1; i <= 5; i++) {
    const sourceIndex = Math.floor(Math.random() * 20);
    const source = [...resources[sourceIndex]];
    
    // Make small changes to simulate manual entry errors
    const changeType = Math.floor(Math.random() * 3);
    
    if (changeType === 0) {
      // Change quantity only
      source[5] = Math.floor(50 + Math.random() * 200);
    } else if (changeType === 1) {
      // Change description slightly
      source[2] = source[2].replace('.', '. Additional info added.').trim();
    } else {
      // Change isLimited but keep the same ID
      source[6] = source[6] === 'true' ? 'false' : 'true';
    }
    
    resources.push(source);
  }
  
  writeCSV('resources.csv', headers, resources);
  return resources;
}

// Generate all the data files
function generateAll() {
  console.log('Generating test data CSV files...');
  generateAttendees();
  generateStaff();
  generateEvents();
  generateResources();
  console.log('Done! Files are in the scripts/output directory and public/templates directory.');
}

// Run the generator
generateAll(); 