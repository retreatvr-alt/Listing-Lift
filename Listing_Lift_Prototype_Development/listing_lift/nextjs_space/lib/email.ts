export async function sendNotificationEmail({
  notificationId,
  recipientEmail,
  subject,
  body,
  isHtml = true
}: {
  notificationId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const appUrl = process.env.NEXTAUTH_URL || '';
    const appName = 'Listing Lift';
    const senderEmail = appUrl ? `noreply@${new URL(appUrl).hostname}` : 'noreply@listinglift.app';

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: notificationId,
        subject,
        body,
        is_html: isHtml,
        recipient_email: recipientEmail,
        sender_email: senderEmail,
        sender_alias: appName,
      }),
    });

    const result = await response.json();
    
    if (!result?.success) {
      if (result?.notification_disabled) {
        console.log('Notification disabled by user, skipping email');
        return { success: true, message: 'Notification disabled' };
      }
      throw new Error(result?.message || 'Failed to send notification');
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function generateSubmissionConfirmationEmail({
  name,
  submissionNumber,
  propertyAddress,
  photoCount
}: {
  name: string;
  submissionNumber: string;
  propertyAddress: string;
  photoCount: number;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f7f4;">
      <div style="background: #383D31; padding: 30px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0; font-size: 28px;">Listing Lift</h1>
        <p style="color: #d4d1c8; margin: 10px 0 0 0;">by Retreat Vacation Rentals</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #383D31; margin-top: 0;">Thank You, ${name}!</h2>
        <p style="color: #555; line-height: 1.6;">Your photo submission has been received. We'll enhance your photos and get back to you soon.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #383D31;">
          <p style="margin: 8px 0;"><strong>Submission ID:</strong> ${submissionNumber}</p>
          <p style="margin: 8px 0;"><strong>Property:</strong> ${propertyAddress}</p>
          <p style="margin: 8px 0;"><strong>Photos Submitted:</strong> ${photoCount}</p>
        </div>
        
        <p style="color: #555; line-height: 1.6;">We'll review your photos and apply our AI enhancements. You'll receive another email once your photos are ready for review.</p>
        
        <p style="color: #888; font-size: 14px; margin-top: 30px;">Questions? Reply to this email or contact us at dan@retreatvr.ca</p>
      </div>
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <p style="color: #d4d1c8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Retreat Vacation Rentals</p>
      </div>
    </div>
  `;
}

export function generateAdminAlertEmail({
  submissionNumber,
  homeownerName,
  email,
  propertyAddress,
  photoCount
}: {
  submissionNumber: string;
  homeownerName: string;
  email: string;
  propertyAddress: string;
  photoCount: number;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0;">New Photo Submission</h1>
      </div>
      <div style="padding: 30px; background: #f9f7f4;">
        <div style="background: white; border-radius: 8px; padding: 20px;">
          <h2 style="color: #383D31; margin-top: 0;">Submission #${submissionNumber}</h2>
          <p><strong>Homeowner:</strong> ${homeownerName}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Property:</strong> ${propertyAddress}</p>
          <p><strong>Photos:</strong> ${photoCount}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/admin" style="background: #383D31; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Dashboard</a>
        </div>
      </div>
    </div>
  `;
}

export function generateStatusUpdateEmail({
  name,
  submissionNumber,
  status,
  message
}: {
  name: string;
  submissionNumber: string;
  status: 'approved' | 'rejected' | 'reupload';
  message?: string;
}): string {
  const statusColors = {
    approved: '#22c55e',
    rejected: '#ef4444',
    reupload: '#f59e0b'
  };
  const statusTitles = {
    approved: 'Photos Approved!',
    rejected: 'Photos Need Attention',
    reupload: 'Re-upload Requested'
  };
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0;">Listing Lift</h1>
      </div>
      <div style="padding: 30px; background: #f9f7f4;">
        <h2 style="color: ${statusColors[status]}; margin-top: 0;">${statusTitles[status]}</h2>
        <p>Hi ${name},</p>
        <p>Your submission #${submissionNumber} has an update.</p>
        ${message ? `<div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;">${message}</p></div>` : ''}
      </div>
    </div>
  `;
}

export function generateMagicLinkEmail({
  name,
  submissionNumber,
  magicLink,
  instructions
}: {
  name: string;
  submissionNumber: string;
  magicLink: string;
  instructions?: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0;">Listing Lift</h1>
      </div>
      <div style="padding: 30px; background: #f9f7f4;">
        <h2 style="color: #383D31; margin-top: 0;">Re-upload Your Photos</h2>
        <p>Hi ${name},</p>
        <p>We've requested some photos to be re-uploaded for submission #${submissionNumber}.</p>
        ${instructions ? `<div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;"><strong>Instructions:</strong><p style="margin: 10px 0 0 0;">${instructions}</p></div>` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background: #383D31; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px;">Re-upload Photos</a>
        </div>
        <p style="color: #888; font-size: 14px;">This link expires in 7 days.</p>
      </div>
    </div>
  `;
}

export function generateAutoEnhanceCompleteEmail({
  submissionNumber,
  homeownerName,
  propertyAddress,
  totalPhotos,
  successCount,
  errorCount
}: {
  submissionNumber: string;
  homeownerName: string;
  propertyAddress: string;
  totalPhotos: number;
  successCount: number;
  errorCount: number;
}): string {
  const allSuccess = errorCount === 0;
  const statusColor = allSuccess ? '#22c55e' : '#f59e0b';
  const statusText = allSuccess 
    ? `All ${successCount} photos enhanced successfully` 
    : `${successCount} of ${totalPhotos} photos enhanced (${errorCount} failed)`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0;">Listing Lift</h1>
        <p style="color: #d4d1c8; margin: 8px 0 0 0;">Auto-Enhancement Complete</p>
      </div>
      <div style="padding: 30px; background: #f9f7f4;">
        <h2 style="color: #383D31; margin-top: 0;">First Round Ready for Review</h2>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${statusColor};">
          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: ${statusColor};">${statusText}</p>
          <p style="margin: 8px 0;"><strong>Submission:</strong> #${submissionNumber}</p>
          <p style="margin: 8px 0;"><strong>Homeowner:</strong> ${homeownerName}</p>
          <p style="margin: 8px 0;"><strong>Property:</strong> ${propertyAddress}</p>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #383D31;">Default Settings Used:</p>
          <ul style="color: #555; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Model: gpt-image-1.5</li>
            <li>Intensity: Moderate</li>
            <li>All toggles OFF (no sky replacement, bed fixing, etc.)</li>
            <li>No creative additions (towels, toilet paper, etc.)</li>
            <li>Room-specific editing prompts applied</li>
            <li>Output: 3000×2000 px (Airbnb standard)</li>
          </ul>
        </div>

        ${errorCount > 0 ? `
        <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e;"><strong>⚠️ ${errorCount} photo(s) failed to enhance.</strong> These can be manually enhanced from the dashboard.</p>
        </div>
        ` : ''}

        <p style="color: #555; line-height: 1.6;">Review the enhancements in the dashboard. You can re-run any photo with different settings, toggle specific corrections, or edit the prompt for more control.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/admin" style="background: #383D31; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Enhancements →</a>
        </div>
      </div>
      <div style="background: #383D31; padding: 15px; text-align: center;">
        <p style="color: #d4d1c8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Retreat Vacation Rentals</p>
      </div>
    </div>
  `;
}

export function generateRetakesRequiredEmail({
  name,
  submissionNumber,
  propertyAddress,
  approvedCount,
  retakePhotos,
  rejectedPhotos,
  magicLink,
  round
}: {
  name: string;
  submissionNumber: string;
  propertyAddress: string;
  approvedCount: number;
  retakePhotos: Array<{ roomCategory: string; subCategory?: string; caption: string; reuploadInstructions?: string }>;
  rejectedPhotos: Array<{ roomCategory: string; subCategory?: string; caption: string; rejectionReason?: string }>;
  magicLink: string;
  round: number;
}): string {
  const retakeList = retakePhotos.map(p => `
    <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #383D31;">${p.subCategory || p.roomCategory} — ${p.caption}</p>
      ${p.reuploadInstructions ? `<p style="margin: 0; color: #555; font-size: 14px;">${p.reuploadInstructions}</p>` : ''}
    </div>
  `).join('');

  const rejectedList = rejectedPhotos.length > 0 ? `
    <div style="margin-top: 30px;">
      <h3 style="color: #ef4444; font-size: 16px;">Photos We Won't Be Using</h3>
      <p style="color: #555; font-size: 14px;">These photos have been excluded from your listing:</p>
      ${rejectedPhotos.map(p => `
        <div style="background: #fef2f2; border-radius: 8px; padding: 12px; margin: 8px 0;">
          <p style="margin: 0; font-weight: bold; color: #383D31; font-size: 14px;">${p.subCategory || p.roomCategory} — ${p.caption}</p>
          ${p.rejectionReason ? `<p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">${p.rejectionReason}</p>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f7f4;">
      <div style="background: #383D31; padding: 30px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0; font-size: 28px;">Listing Lift</h1>
        <p style="color: #d4d1c8; margin: 10px 0 0 0;">by Retreat Vacation Rentals</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #383D31; margin-top: 0;">Almost There${round > 1 ? ` (Round ${round})` : ''}!</h2>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">Hi ${name},</p>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">
          <strong>${approvedCount} photos look fantastic!</strong> We just need ${retakePhotos.length} new shot${retakePhotos.length > 1 ? 's' : ''} to complete your listing at ${propertyAddress}.
        </p>

        <h3 style="color: #f59e0b; font-size: 16px; margin-top: 25px;">Photos To Retake</h3>
        ${retakeList}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background: #383D31; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px; font-weight: bold;">Upload Replacement Photos</a>
        </div>

        <p style="color: #888; font-size: 14px; text-align: center;">
          You can upload photos at different times — no need to do everything at once.<br/>
          Your link works for 30 days.
        </p>

        ${rejectedList}

        <p style="color: #888; font-size: 14px; margin-top: 30px;">Questions? Reply to this email or contact us at dan@retreatvr.ca</p>
      </div>
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <p style="color: #d4d1c8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Retreat Vacation Rentals</p>
      </div>
    </div>
  `;
}

export function generatePhotosReadyEmail({
  name,
  submissionNumber,
  propertyAddress,
  approvedCount,
  heroCount,
  deliveryLink,
  downloadLink
}: {
  name: string;
  submissionNumber: string;
  propertyAddress: string;
  approvedCount: number;
  heroCount: number;
  deliveryLink: string;
  downloadLink: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f7f4;">
      <div style="background: #383D31; padding: 30px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0; font-size: 28px;">Listing Lift</h1>
        <p style="color: #d4d1c8; margin: 10px 0 0 0;">by Retreat Vacation Rentals</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #22c55e; margin-top: 0;">Your Photos Are Ready! 🎉</h2>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">Hi ${name},</p>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">
          Great news! Your <strong>${approvedCount} enhanced photos</strong> for ${propertyAddress} are ready to view and download.
        </p>

        ${heroCount > 0 ? `
        <div style="background: #fffbeb; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            ⭐ <strong>${heroCount} cover photo${heroCount > 1 ? 's' : ''}</strong> optimized for Airbnb (4000×2667 pixels)
          </p>
        </div>
        ` : ''}

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; color: #383D31; font-weight: bold;">Submission #${submissionNumber}</p>
          <p style="margin: 0; color: #555;">${propertyAddress}</p>
          <p style="margin: 8px 0 0 0; color: #555;">${approvedCount} enhanced photos</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${deliveryLink}" style="background: #383D31; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px; font-weight: bold;">View & Download Your Photos</a>
        </div>

        <p style="color: #555; text-align: center; font-size: 14px;">
          Or <a href="${downloadLink}" style="color: #383D31; font-weight: bold;">download all as a ZIP file</a>
        </p>

        <p style="color: #888; font-size: 14px; text-align: center; margin-top: 25px;">
          Your photos will be available for 30 days.
        </p>

        <p style="color: #888; font-size: 14px; margin-top: 30px;">Questions? Reply to this email or contact us at dan@retreatvr.ca</p>
      </div>
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <p style="color: #d4d1c8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Retreat Vacation Rentals</p>
      </div>
    </div>
  `;
}

export function generateRetakesReceivedAdminEmail({
  submissionNumber,
  homeownerName,
  propertyAddress,
  uploadedCount,
  totalRetakes
}: {
  submissionNumber: string;
  homeownerName: string;
  propertyAddress: string;
  uploadedCount: number;
  totalRetakes: number;
}): string {
  const allDone = uploadedCount >= totalRetakes;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0;">Retakes Received</h1>
      </div>
      <div style="padding: 30px; background: #f9f7f4;">
        <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid ${allDone ? '#22c55e' : '#f59e0b'};">
          <h2 style="color: #383D31; margin-top: 0;">
            ${allDone ? '✅ All Retakes Received' : `📷 ${uploadedCount} of ${totalRetakes} Retakes Uploaded`}
          </h2>
          <p><strong>Submission:</strong> #${submissionNumber}</p>
          <p><strong>Homeowner:</strong> ${homeownerName}</p>
          <p><strong>Property:</strong> ${propertyAddress}</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/admin" style="background: #383D31; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${allDone ? 'Review Retakes →' : 'View Dashboard →'}
          </a>
        </div>
      </div>
    </div>
  `;
}
