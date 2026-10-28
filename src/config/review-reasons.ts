/**
 * Ready-made reasons for rejecting a check (brief §6: "approve or reject
 * with reason templates"). Each is written to the worker, saying what to do.
 * Admins can edit the wording before sending.
 */
export type ReviewKind =
  "photo" | "identity" | "right_to_work" | "ticket" | "police_check";

export function reviewReasons(
  kind: ReviewKind,
  policeCheckMaxAgeMonths = 12,
): string[] {
  switch (kind) {
    case "photo":
      return [
        "We can't see your face clearly. Take a photo facing the camera, in good light.",
        "Please take off sunglasses or a hat for your photo.",
        "Only you should be in the photo.",
      ];
    case "identity":
      return [
        "The photo of your ID is blurry or cut off. Take it again with all four corners showing.",
        "The name on your ID doesn't match the name you gave us. Check your details, then upload again.",
        "The date of birth on your ID doesn't match the one you gave us.",
        "Your ID has expired. Upload a current driver licence or passport.",
        "Your selfie doesn't clearly match your ID photo. Take a new selfie facing the camera.",
      ];
    case "right_to_work":
      return [
        "The document is blurry or cut off. Upload a clearer photo or scan.",
        "The name on the document doesn't match your ID.",
        "We couldn't find your visa with the details you gave. Check your passport number and country.",
        "VEVO doesn't show that you can work in Australia. Contact us if you think that's wrong.",
      ];
    case "ticket":
      return [
        "The photo is blurry or cut off. Upload a clearer copy.",
        "The name on the ticket doesn't match your ID.",
        "This ticket has expired. Upload your renewed ticket.",
        "This isn't the ticket you chose. Check which ticket it is, then upload it again.",
        "We couldn't confirm this ticket with the issuer. Contact us so we can sort it out.",
      ];
    case "police_check":
      return [
        `This check is more than ${policeCheckMaxAgeMonths} months old. Upload a check issued in the last ${policeCheckMaxAgeMonths} months.`,
        "This isn't a National Police Check. Upload the certificate from an accredited provider.",
        "The certificate is hard to read. Upload the PDF you were emailed.",
        "The name on the certificate doesn't match your ID.",
      ];
  }
}
