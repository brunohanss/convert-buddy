#![cfg(not(test))]

use convert_buddy::xml_parser::{XmlConfig, XmlParser};

fn main() {
    let config = XmlConfig {
        record_element: "character".to_string(),
        include_attributes: false,
        ..Default::default()
    };

    let mut parser = XmlParser::new(config, 4096);

    let xml = br#"<?xml version="1.0" encoding="UTF-8"?>
<characters>
  <character>
    <name>Gorwin "Grog" Oakenshield</name>
    <race>Human</race>
    <class>Barbarian</class>
    <quirk>Collects spoons from every tavern</quirk>
  </character>
  <character>
    <name>Zilaen Whisperleaf</name>
    <race>Elf</race>
    <class>Rogue</class>
    <quirk>Talks to shadows, claims they're shy</quirk>
  </character>
  <character>
    <name>Pip Thistlewhisk</name>
    <race>Halfling</race>
    <class>Bard</class>
    <quirk>Plays the lute with carrots</quirk>
  </character>
  <character>
    <name>Thraxxus Bonegrinder</name>
    <race>Orc</race>
    <class>Cleric</class>
    <quirk>Prays to a rock named Doris</quirk>
  </character>
  <character>
    <name>Elaria Moonbeam</name>
    <race>Half-Elf</race>
    <class>Wizard</class>
    <quirk>Writes shopping lists in ancient runes</quirk>
  </character>
</characters>"#;

    let out = parser.push_to_ndjson(xml).expect("push_to_ndjson failed");
    let out_str = String::from_utf8_lossy(&out);

    println!("Parsed NDJSON output:\n{}", out_str);
    println!("record_count: {}", parser.record_count());
}
