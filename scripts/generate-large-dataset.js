const fs = require('fs');
const path = require('path');

// Character data from various franchises
const franchises = {
  'American Dad': [
    { name: 'Stan Smith', role: 'Father', age: 42, catchphrase: 'Good morning USA!', first_appearance: 2005 },
    { name: 'Francine Smith', role: 'Mother', age: 40, catchphrase: 'Stan!', first_appearance: 2005 },
    { name: 'Roger Smith', role: 'Alien', age: 1601, catchphrase: 'Ricky Spanish', first_appearance: 2005 },
    { name: 'Steve Smith', role: 'Son', age: 15, catchphrase: 'Oh my God!', first_appearance: 2005 },
    { name: 'Hayley Smith', role: 'Daughter', age: 19, catchphrase: 'Whatever', first_appearance: 2005 },
    { name: 'Klaus Heissler', role: 'Fish', age: 60, catchphrase: 'Danuta', first_appearance: 2005 },
  ],
  'Rick and Morty': [
    { name: 'Rick Sanchez', role: 'Grandfather', age: 70, catchphrase: 'Wubba lubba dub dub!', first_appearance: 2013 },
    { name: 'Morty Smith', role: 'Grandson', age: 14, catchphrase: 'Aw geez Rick', first_appearance: 2013 },
    { name: 'Summer Smith', role: 'Granddaughter', age: 17, catchphrase: 'Ugh', first_appearance: 2013 },
    { name: 'Beth Smith', role: 'Daughter', age: 35, catchphrase: 'I am a surgeon', first_appearance: 2013 },
    { name: 'Jerry Smith', role: 'Son-in-law', age: 35, catchphrase: 'My man!', first_appearance: 2013 },
    { name: 'Mr. Meeseeks', role: 'Helper', age: 0, catchphrase: "I'm Mr. Meeseeks look at me!", first_appearance: 2014 },
    { name: 'Birdperson', role: 'Friend', age: 45, catchphrase: 'It has been a challenging mating season', first_appearance: 2014 },
    { name: 'Squanchy', role: 'Friend', age: 40, catchphrase: 'Squanch', first_appearance: 2014 },
  ],
  'Family Guy': [
    { name: 'Peter Griffin', role: 'Father', age: 45, catchphrase: 'Hehehehe', first_appearance: 1999 },
    { name: 'Lois Griffin', role: 'Mother', age: 43, catchphrase: 'Peter!', first_appearance: 1999 },
    { name: 'Meg Griffin', role: 'Daughter', age: 18, catchphrase: 'Shut up', first_appearance: 1999 },
    { name: 'Chris Griffin', role: 'Son', age: 14, catchphrase: 'Oh man', first_appearance: 1999 },
    { name: 'Stewie Griffin', role: 'Baby', age: 1, catchphrase: 'Victory is mine!', first_appearance: 1999 },
    { name: 'Brian Griffin', role: 'Dog', age: 8, catchphrase: 'Whose leg do you have to hump', first_appearance: 1999 },
    { name: 'Glenn Quagmire', role: 'Neighbor', age: 61, catchphrase: 'Giggity', first_appearance: 1999 },
  ],
  'The Simpsons': [
    { name: 'Homer Simpson', role: 'Father', age: 39, catchphrase: "D'oh!", first_appearance: 1989 },
    { name: 'Marge Simpson', role: 'Mother', age: 36, catchphrase: 'Hmmmm', first_appearance: 1989 },
    { name: 'Bart Simpson', role: 'Son', age: 10, catchphrase: 'Eat my shorts!', first_appearance: 1989 },
    { name: 'Lisa Simpson', role: 'Daughter', age: 8, catchphrase: 'If anyone wants me', first_appearance: 1989 },
    { name: 'Maggie Simpson', role: 'Baby', age: 1, catchphrase: '*sucks pacifier*', first_appearance: 1989 },
    { name: 'Ned Flanders', role: 'Neighbor', age: 60, catchphrase: 'Okily dokily!', first_appearance: 1989 },
    { name: 'Mr. Burns', role: 'Boss', age: 104, catchphrase: 'Excellent', first_appearance: 1989 },
  ],
  'South Park': [
    { name: 'Eric Cartman', role: 'Student', age: 10, catchphrase: 'Respect my authoritah!', first_appearance: 1997 },
    { name: 'Stan Marsh', role: 'Student', age: 10, catchphrase: 'Oh my God!', first_appearance: 1997 },
    { name: 'Kyle Broflovski', role: 'Student', age: 10, catchphrase: 'You bastards!', first_appearance: 1997 },
    { name: 'Kenny McCormick', role: 'Student', age: 10, catchphrase: 'Mmph mmmph!', first_appearance: 1997 },
    { name: 'Butters Stotch', role: 'Student', age: 10, catchphrase: 'Oh hamburgers', first_appearance: 2000 },
  ],
  'Futurama': [
    { name: 'Philip J. Fry', role: 'Delivery Boy', age: 1025, catchphrase: "I'm not sure", first_appearance: 1999 },
    { name: 'Turanga Leela', role: 'Captain', age: 29, catchphrase: 'You idiots', first_appearance: 1999 },
    { name: 'Bender Rodriguez', role: 'Robot', age: 4, catchphrase: 'Bite my shiny metal ass!', first_appearance: 1999 },
    { name: 'Professor Farnsworth', role: 'Professor', age: 160, catchphrase: 'Good news everyone!', first_appearance: 1999 },
    { name: 'Zoidberg', role: 'Doctor', age: 80, catchphrase: 'Why not Zoidberg?', first_appearance: 1999 },
  ],
  'Star Wars': [
    { name: 'Luke Skywalker', role: 'Jedi Knight', age: 23, catchphrase: 'I am a Jedi', first_appearance: 1977 },
    { name: 'Darth Vader', role: 'Sith Lord', age: 45, catchphrase: 'I am your father', first_appearance: 1977 },
    { name: 'Princess Leia', role: 'Princess', age: 19, catchphrase: 'Help me Obi-Wan', first_appearance: 1977 },
    { name: 'Han Solo', role: 'Smuggler', age: 32, catchphrase: 'Never tell me the odds', first_appearance: 1977 },
    { name: 'Chewbacca', role: 'Co-pilot', age: 200, catchphrase: 'Aarrrggh!', first_appearance: 1977 },
    { name: 'Yoda', role: 'Jedi Master', age: 900, catchphrase: 'Do or do not', first_appearance: 1980 },
    { name: 'Obi-Wan Kenobi', role: 'Jedi Master', age: 57, catchphrase: 'These are not the droids', first_appearance: 1977 },
    { name: 'Palpatine', role: 'Emperor', age: 88, catchphrase: 'Unlimited power!', first_appearance: 1983 },
    { name: 'Anakin Skywalker', role: 'Jedi', age: 22, catchphrase: "I don't like sand", first_appearance: 1999 },
    { name: 'Padme Amidala', role: 'Queen', age: 24, catchphrase: 'So this is how liberty dies', first_appearance: 1999 },
    { name: 'Rey', role: 'Jedi', age: 19, catchphrase: "I'm Rey", first_appearance: 2015 },
    { name: 'Kylo Ren', role: 'Sith', age: 29, catchphrase: 'Show me grandfather', first_appearance: 2015 },
  ],
  'Lord of the Rings': [
    { name: 'Frodo Baggins', role: 'Ring Bearer', age: 50, catchphrase: 'I will take it!', first_appearance: 1954 },
    { name: 'Samwise Gamgee', role: 'Companion', age: 38, catchphrase: "I can't carry it for you", first_appearance: 1954 },
    { name: 'Gandalf', role: 'Wizard', age: 2000, catchphrase: 'You shall not pass!', first_appearance: 1954 },
    { name: 'Aragorn', role: 'King', age: 87, catchphrase: 'For Frodo', first_appearance: 1954 },
    { name: 'Legolas', role: 'Elf', age: 2931, catchphrase: 'They are taking the hobbits', first_appearance: 1954 },
    { name: 'Gimli', role: 'Dwarf', age: 139, catchphrase: 'And my axe!', first_appearance: 1954 },
    { name: 'Boromir', role: 'Warrior', age: 41, catchphrase: 'One does not simply walk', first_appearance: 1954 },
    { name: 'Gollum', role: 'Creature', age: 589, catchphrase: 'My precious!', first_appearance: 1954 },
    { name: 'Saruman', role: 'Wizard', age: 2000, catchphrase: 'Build me an army', first_appearance: 1954 },
  ],
  'Harry Potter': [
    { name: 'Harry Potter', role: 'Wizard', age: 11, catchphrase: 'Expelliarmus!', first_appearance: 1997 },
    { name: 'Hermione Granger', role: 'Witch', age: 11, catchphrase: "It's leviOsa", first_appearance: 1997 },
    { name: 'Ron Weasley', role: 'Wizard', age: 11, catchphrase: 'Bloody hell!', first_appearance: 1997 },
    { name: 'Albus Dumbledore', role: 'Headmaster', age: 115, catchphrase: 'It does not do to dwell', first_appearance: 1997 },
    { name: 'Severus Snape', role: 'Professor', age: 38, catchphrase: 'Always', first_appearance: 1997 },
    { name: 'Lord Voldemort', role: 'Dark Lord', age: 71, catchphrase: 'Avada Kedavra', first_appearance: 1997 },
    { name: 'Draco Malfoy', role: 'Student', age: 11, catchphrase: 'My father will hear', first_appearance: 1997 },
  ],
  'Marvel': [
    { name: 'Iron Man', role: 'Superhero', age: 38, catchphrase: 'I am Iron Man', first_appearance: 1963 },
    { name: 'Spider-Man', role: 'Superhero', age: 17, catchphrase: 'With great power', first_appearance: 1962 },
    { name: 'Captain America', role: 'Superhero', age: 100, catchphrase: 'I can do this all day', first_appearance: 1941 },
    { name: 'Thor', role: 'God', age: 1500, catchphrase: 'I am Thor!', first_appearance: 1962 },
    { name: 'Hulk', role: 'Monster', age: 49, catchphrase: 'Hulk smash!', first_appearance: 1962 },
    { name: 'Black Widow', role: 'Spy', age: 34, catchphrase: "I've got red in my ledger", first_appearance: 1964 },
    { name: 'Wolverine', role: 'Mutant', age: 200, catchphrase: "I'm the best", first_appearance: 1974 },
  ],
  'DC Comics': [
    { name: 'Batman', role: 'Superhero', age: 35, catchphrase: 'I am vengeance', first_appearance: 1939 },
    { name: 'Superman', role: 'Superhero', age: 33, catchphrase: 'Truth and justice', first_appearance: 1938 },
    { name: 'Wonder Woman', role: 'Superhero', age: 5000, catchphrase: 'For Themyscira!', first_appearance: 1941 },
    { name: 'The Flash', role: 'Speedster', age: 25, catchphrase: 'My name is Barry Allen', first_appearance: 1956 },
    { name: 'Aquaman', role: 'King', age: 35, catchphrase: 'I am the protector', first_appearance: 1941 },
    { name: 'Joker', role: 'Villain', age: 40, catchphrase: 'Why so serious?', first_appearance: 1940 },
  ],
  'Game of Thrones': [
    { name: 'Jon Snow', role: 'King', age: 23, catchphrase: 'You know nothing', first_appearance: 1996 },
    { name: 'Daenerys Targaryen', role: 'Queen', age: 22, catchphrase: 'I am the blood', first_appearance: 1996 },
    { name: 'Tyrion Lannister', role: 'Hand', age: 32, catchphrase: 'I drink and I know', first_appearance: 1996 },
    { name: 'Arya Stark', role: 'Assassin', age: 16, catchphrase: 'A girl has no name', first_appearance: 1996 },
    { name: 'Cersei Lannister', role: 'Queen', age: 42, catchphrase: 'When you play the game', first_appearance: 1996 },
  ],
  'The Office': [
    { name: 'Michael Scott', role: 'Manager', age: 45, catchphrase: "That's what she said", first_appearance: 2005 },
    { name: 'Dwight Schrute', role: 'Salesman', age: 38, catchphrase: 'Bears. Beets. Battlestar Galactica.', first_appearance: 2005 },
    { name: 'Jim Halpert', role: 'Salesman', age: 32, catchphrase: '*looks at camera*', first_appearance: 2005 },
    { name: 'Pam Beesly', role: 'Receptionist', age: 28, catchphrase: 'They are the same picture', first_appearance: 2005 },
  ],
  'Breaking Bad': [
    { name: 'Walter White', role: 'Teacher', age: 50, catchphrase: 'I am the one who knocks', first_appearance: 2008 },
    { name: 'Jesse Pinkman', role: 'Cook', age: 25, catchphrase: 'Yeah science!', first_appearance: 2008 },
    { name: 'Saul Goodman', role: 'Lawyer', age: 50, catchphrase: 'Better call Saul', first_appearance: 2009 },
  ],
};

// Generate CSV content
function generateCSV(targetSizeMB = 50) {
  const targetBytes = targetSizeMB * 1024 * 1024;
  const header = 'id,name,franchise,role,age,catchphrase,first_appearance,power_level,alignment,species\n';
  let csv = header;
  let id = 1;
  
  const alignments = ['Good', 'Evil', 'Neutral', 'Chaotic Good', 'Lawful Good', 'Chaotic Evil'];
  const species = ['Human', 'Alien', 'Robot', 'Elf', 'Dwarf', 'Wizard', 'Mutant', 'God', 'Monster', 'Fish'];
  
  // Calculate approximate iterations needed
  const avgRecordSize = 150; // approximate bytes per record
  const recordsNeeded = Math.ceil(targetBytes / avgRecordSize);
  
  console.log(`Generating approximately ${recordsNeeded.toLocaleString()} records to reach ${targetSizeMB}MB...`);
  
  while (csv.length < targetBytes) {
    for (const [franchise, characters] of Object.entries(franchises)) {
      for (const char of characters) {
        const powerLevel = Math.floor(Math.random() * 10000);
        const alignment = alignments[Math.floor(Math.random() * alignments.length)];
        const speciesType = species[Math.floor(Math.random() * species.length)];
        
        // Escape CSV fields that contain commas or quotes
        const escapedCatchphrase = `"${char.catchphrase.replace(/"/g, '""')}"`;
        
        csv += `${id},${char.name},"${franchise}",${char.role},${char.age},${escapedCatchphrase},${char.first_appearance},${powerLevel},${alignment},${speciesType}\n`;
        id++;
        
        if (csv.length >= targetBytes) {
          break;
        }
      }
      if (csv.length >= targetBytes) {
        break;
      }
    }
  }
  
  const finalSizeMB = (csv.length / 1024 / 1024).toFixed(2);
  const recordCount = id - 1;
  console.log(`✅ Generated ${recordCount.toLocaleString()} records`);
  console.log(`✅ File size: ${finalSizeMB}MB`);
  
  return csv;
}

// Main execution
const outputPath = path.join(__dirname, '..', 'apps', 'web', 'public', 'samples', 'cartoon_characters.csv');
console.log(`Generating large dataset to: ${outputPath}`);

const csvContent = generateCSV(50);
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log('✅ Done! File saved to:', outputPath);
