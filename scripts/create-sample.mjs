import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Original fictional content created for Recall.
// This sample may be included and distributed with the project.
const sections = [
  {
    title: "Membership and pricing",
    paragraphs: [
      "Harborlight Workspace is a fictional coworking space used to demonstrate Recall. This handbook describes its example policies for November 2026. All people, prices, services, and procedures in this document are fictional. It is a product demonstration document, not an agreement with a real business.",

      "The Flex membership costs $120 per month and includes eight workspace visits per calendar month. A visit is counted when a member checks in, regardless of how long they stay. Unused visits expire at the end of the month and do not roll over. Flex members use shared desks rather than assigned seats.",

      "The Resident membership costs $240 per month and includes unlimited workspace visits during normal opening hours. It also includes a dedicated desk and a small lockable drawer. Resident membership does not include overnight access. Both membership types include internet access, drinking water, and use of the shared kitchen.",

      "Membership charges are collected on the first day of each month. A member may switch plans for the following month by submitting a request before the 25th. Plan changes do not take effect immediately. Membership prices exclude meeting-room charges, printing charges, and optional event tickets, which are billed separately.",
    ],
  },
  {
    title: "Opening hours and entry",
    paragraphs: [
      "Harborlight opens Monday through Friday from 8:00 a.m. until 8:00 p.m. On Saturdays it opens from 9:00 a.m. until 3:00 p.m. The workspace is closed on Sundays. These hours apply to both Flex and Resident members. A dedicated desk does not provide access outside these hours.",

      "Members enter using a personal digital access pass. Each person must check in separately, and access passes may not be shared. If a pass stops working, the member should contact the reception desk during opening hours. Reception can verify membership and issue a temporary pass for that day.",

      "The final entry time is 30 minutes before closing. Members already inside must leave by closing time. Reception announces closing 15 minutes in advance. Meetings, calls, and printing should finish early enough for members to collect their belongings and leave without delaying the closing procedure.",

      "A member who loses an access device should report it promptly so the associated pass can be disabled. A replacement physical access card costs $10; a replacement digital pass has no charge. The workspace does not provide overnight storage except for the Resident member's assigned drawer.",
    ],
  },
  {
    title: "Meeting rooms and reservations",
    paragraphs: [
      "Harborlight has two meeting rooms. Cedar seats four people and costs $12 per hour. Maple seats eight people and costs $20 per hour. Room charges apply to both membership plans. A membership provides workspace access but does not include complimentary meeting-room hours.",

      "Reservations can be made up to 14 days in advance. Each reservation must last at least 30 minutes and no more than three hours. A member may hold up to two future room reservations at a time. Once a reservation ends, it no longer counts toward that limit.",

      "The member who books a room must attend the meeting and remains responsible for the reservation. Rooms may be used for team discussions, interviews, or video calls. The number of people in the room must not exceed its stated capacity. A room reservation does not authorize access outside normal opening hours.",

      "Members must check in for a room within 10 minutes of the scheduled start. After that grace period, reception may release the room to another member. A released reservation is treated as a no-show and is charged in full. A reservation ends at its scheduled time even when the meeting begins late.",
    ],
  },
  {
    title: "Cancellations and refunds",
    paragraphs: [
      "A meeting-room reservation canceled at least 24 hours before its start receives a full refund of the room charge. A cancellation made less than 24 hours before the start receives no refund. The cancellation time is measured against the scheduled start, not the time the member originally made the booking.",

      "For example, canceling a Thursday 2:00 p.m. room reservation by Wednesday 2:00 p.m. qualifies for a full refund. Canceling it on Thursday morning does not. Moving a reservation to another date counts as canceling the original booking and creating a new one, so the same refund deadline applies.",

      "If Harborlight cancels a reservation because a room is unavailable, the room charge is refunded in full regardless of notice. Members may accept an alternative room instead, but only with their agreement. Refunds return to the original payment method and are submitted within five business days.",

      "To end a membership, a member must submit a cancellation request before the 25th of the current month. Access continues through the final day of that month. Requests received on or after the 25th take effect at the end of the following month. Monthly membership fees are not prorated.",
    ],
  },
  {
    title: "Guests and shared-space rules",
    paragraphs: [
      "Each member may bring one guest per day for up to two hours without a guest fee. The host must remain with the guest throughout the visit. Guests must sign in at reception and wear a visitor badge. A guest visit does not create a separate membership or provide independent workspace access.",

      "A guest staying longer than two hours needs a $15 day pass, subject to available space. The day pass covers workspace use until closing on that day. It does not include meeting-room charges. A member hosting a meeting must account for the room's capacity even when guests have day passes.",

      "The quiet zone is reserved for individual work. Phone calls and video meetings are not permitted there, even when headphones are used. Members may take short calls in a phone booth or book a meeting room for longer conversations. Phone booths cannot be reserved and have a 30-minute continuous-use limit.",

      "Food is permitted in the kitchen and lounge, but not in the quiet zone or meeting rooms. Drinks in closed containers are permitted at desks. Members should clear shared desks when leaving for the day and return borrowed chargers to reception. Personal items left at shared desks are moved to lost property.",
    ],
  },
  {
    title: "Printing, storage, and support",
    paragraphs: [
      "Black-and-white printing costs $0.08 per printed side. Color printing costs $0.30 per printed side. Double-sided printing therefore incurs two side charges for each sheet. Printing is billed separately from membership. Members confirm the number of sides and whether color is needed before submitting a print job.",

      "Print files are automatically removed from the print queue after 24 hours, whether or not they were printed. This rule applies to uploaded print files, not to membership records or payment records. Members should collect printed pages promptly. Reception does not check printed documents for accuracy or completeness.",

      "Resident members may keep personal work materials in their assigned drawer during an active membership. Shared desks do not include storage. Lost-property items are held for 30 calendar days after they are found. Members can ask reception about a missing item by describing it and giving the approximate date it was lost.",

      "General support requests can be submitted through the member portal. The target for an initial response is one business day; this is not a guaranteed resolution time. For an access problem during opening hours, contact reception directly. This handbook does not specify parking availability, pet rules, or international locations.",
    ],
  },
];

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

pdf.setTitle("Harborlight Workspace - Sample Handbook");
pdf.setAuthor("Recall Demo");
pdf.setSubject("Original fictional sample document for PDF question answering");
pdf.setCreationDate(new Date("2026-11-01T00:00:00Z"));
pdf.setModificationDate(new Date("2026-11-01T00:00:00Z"));

function wrapText(text, size, maxWidth) {
  const lines = [];
  let line = "";

  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

sections.forEach((section, index) => {
  const page = pdf.addPage([612, 792]);

  page.drawText("HARBORLIGHT WORKSPACE", {
    x: 54,
    y: 738,
    font: bold,
    size: 10,
    color: rgb(0.05, 0.4, 0.4),
  });

  page.drawText(section.title, {
    x: 54,
    y: 698,
    font: bold,
    size: 21,
    color: rgb(0.08, 0.12, 0.2),
  });

  let y = 658;

  for (const paragraph of section.paragraphs) {
    for (const line of wrapText(paragraph, 11, 504)) {
      if (y < 90) {
        throw new Error(`Text overflow on page ${index + 1}`);
      }

      page.drawText(line, {
        x: 54,
        y,
        font,
        size: 11,
        color: rgb(0.15, 0.18, 0.23),
      });

      y -= 17;
    }

    y -= 14;
  }

  page.drawText(
    `Fictional Recall sample | November 2026 | Page ${index + 1} of ${sections.length}`,
    {
      x: 54,
      y: 48,
      font,
      size: 9,
      color: rgb(0.4, 0.44, 0.5),
    },
  );
});

const outputDirectory = new URL("../public/sample/", import.meta.url);
const outputFile = new URL(
  "../public/sample/recall-handbook.pdf",
  import.meta.url,
);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, await pdf.save());

console.log(`Created ${outputFile.pathname}`);
console.log(`Pages: ${sections.length}`);
