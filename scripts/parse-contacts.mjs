#!/usr/bin/env node

import fs from 'fs';

// Parse HTML and extract staff data
function parseHTML(html) {
  const rows = [];
  const lines = html.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('<tr>') && !line.includes('<th>')) {
      // Extract all <td> content from this row
      const tds = [];
      let currentLine = line;
      
      // Find all <td>...</td> patterns
      const tdRegex = /<td>(.*?)<\/td>/g;
      let match;
      while ((match = tdRegex.exec(currentLine)) !== null) {
        tds.push(match[1]);
      }
      
      // If we didn't find any in the first line, check subsequent lines
      if (tds.length === 0 && i + 1 < lines.length) {
        currentLine = lines[i] + lines[i + 1];
        while ((match = tdRegex.exec(currentLine)) !== null) {
          tds.push(match[1]);
        }
      }
      
      // Skip if we don't have enough columns
      if (tds.length < 11) continue;
      
      // Extract designation from <b> tag
      const designationMatch = tds[5].match(/<b>(.*?)<\/b>/);
      const designation = designationMatch ? designationMatch[1] : tds[5];
      
      rows.push({
        sNo: tds[0],
        name: tds[1],
        cnic: tds[2],
        contact1: tds[3],
        contact2: tds[4],
        designation: designation,
        gender: tds[6],
        religion: tds[7],
        maritalStatus: tds[8],
        area: tds[9],
        address: tds[10]
      });
    }
  }
  
  return rows;
}

// Normalize phone number
function normalizePhone(phone) {
  if (!phone || phone === '-' || phone === '') {
    return null;
  }
  
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Remove leading 0 if present
  const cleaned = digits.startsWith('0') ? digits.substring(1) : digits;
  
  // Check if valid
  if (!cleaned || cleaned.length < 9) {
    return { phone: '', status: 'invalid', notes: 'too short' };
  }
  
  // Prepend 92 for Pakistan
  const normalized = '92' + cleaned;
  return { phone: normalized, status: 'pending', notes: '' };
}

// Main function
function main() {
  const htmlPath = '/home/archbtw/downloads/staff-filtered.html';
  const outputPath = '/home/archbtw/dev/work/international_nurses/whatsapp-sent.csv';
  
  // Read HTML file
  const html = fs.readFileSync(htmlPath, 'utf8');
  const rows = parseHTML(html);
  
  const uniqueEntries = new Map(); // Key -> entry
  
  for (const row of rows) {
    const name = row.name.trim();
    const designation = row.designation.trim();
    
    // Process Contact1
    const contact1Result = normalizePhone(row.contact1);
    const contact2Result = normalizePhone(row.contact2);
    
    // Determine which numbers to add
    const numbersToAdd = [];
    
    const c1Empty = !row.contact1 || row.contact1 === '-' || row.contact1 === '';
    const c2Empty = !row.contact2 || row.contact2 === '-' || row.contact2 === '';
    
    if (c1Empty && c2Empty) {
      // Both empty — add no-phone entry
      numbersToAdd.push({ phone: '', status: 'no-phone', notes: 'both contacts empty' });
    } else {
      // Try Contact 1
      if (!c1Empty && contact1Result && contact1Result.phone) {
        numbersToAdd.push(contact1Result);
      }
      // Try Contact 2 (only if different from Contact 1)
      if (!c2Empty && contact2Result && contact2Result.phone) {
        const c1Phone = contact1Result ? contact1Result.phone : '';
        if (contact2Result.phone !== c1Phone) {
          numbersToAdd.push(contact2Result);
        }
      }
      // If neither produced a valid number but we had non-empty input, add any error result
      if (numbersToAdd.length === 0) {
        if (contact1Result) numbersToAdd.push(contact1Result);
        else if (contact2Result) numbersToAdd.push(contact2Result);
      }
    }
    
    // Add each number to the unique entries map
    for (const entry of numbersToAdd) {
      const key = `${entry.phone}|${name.toLowerCase()}|${designation}`;
      
      if (!uniqueEntries.has(key)) {
        uniqueEntries.set(key, {
          phone: entry.phone,
          name: name,
          designation: designation,
          status: entry.status,
          date: '2026-07-17',
          notes: entry.notes
        });
      }
    }
  }
  
  // Convert to array and write CSV
  const csvLines = [];
  csvLines.push('phone,name,designation,status,date,notes');
  
  for (const entry of uniqueEntries.values()) {
    const line = [
      entry.phone,
      entry.name,
      entry.designation,
      entry.status,
      entry.date,
      entry.notes
    ].map(field => {
      // Escape quotes and wrap in quotes if contains comma or quote
      if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
        return '"' + field.replace(/"/g, '""') + '"';
      }
      return field;
    }).join(',');
    
    csvLines.push(line);
  }
  
  // Write to file
  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
  
  console.log('Generated ' + (csvLines.length - 1) + ' unique entries');
  console.log('Output written to: ' + outputPath);
}

// Run the script
main();