# Apple App Store — Master Pre-Submission Compliance Checklist
## For AI Developers / CI-CD / iOS Release Gates

**Document purpose:** Use this document as a mandatory preflight checklist before submitting any iOS/iPadOS app or update to Apple App Review.

**Source baseline:** Apple App Review Guidelines, current page last updated **8 June 2026**. This document is a **developer-oriented paraphrase and checklist**, not a replacement for Apple's official legal/policy text.

**Critical rule:** If a rule below is not applicable to the app, mark it `N/A` with a reason. Do not silently skip it.

**Important:** Apple states that the guidelines are a living document and may change. The AI developer must re-check the official Apple sources before every production submission.

---

# 0. RELEASE GATE — HARD STOP

The AI/developer MUST NOT recommend or execute production submission if any applicable item below is unresolved.

## Mandatory gates

- [ ] App builds successfully in Release configuration.
- [ ] App launches successfully after a clean install.
- [ ] No crash/blocking bug exists in the primary user journey.
- [ ] All core features work on supported devices/OS versions.
- [ ] Backend/API services are live and reachable by Apple reviewers.
- [ ] Demo/review account works without human intervention.
- [ ] CAPTCHA/human-verification systems do not block Apple review.
- [ ] Review instructions are complete and accurate.
- [ ] All required metadata is complete and truthful.
- [ ] Privacy Policy URL is valid and accessible.
- [ ] App Privacy declarations match actual app + third-party SDK behavior.
- [ ] Age rating is truthful.
- [ ] Account deletion is implemented when account creation is supported.
- [ ] Digital purchases use the correct Apple payment mechanism unless a documented exception/entitlement applies.
- [ ] Subscription terms and pricing are clearly presented.
- [ ] Restore-purchase flow works where applicable.
- [ ] Required permissions have correct purpose strings and are requested only when needed.
- [ ] ATT is implemented where tracking requires it.
- [ ] Third-party SDKs comply with Apple rules.
- [ ] No hidden functionality, undocumented feature, deceptive behavior, or review-specific deception exists.
- [ ] No copied/impersonating UI, name, icon, brand, or protected content is present without rights.
- [ ] No prohibited APIs/private APIs are used.
- [ ] IPv6-only networking works.
- [ ] iPad behavior has been tested if the app is available on iPad.
- [ ] App Store screenshots show the real app.
- [ ] App Store description accurately represents the shipped functionality.
- [ ] App Review Notes explain non-obvious functionality and test instructions.
- [ ] Export compliance and other App Store Connect compliance questions are answered accurately.
- [ ] Legal/licensing requirements are satisfied in every distribution territory.
- [ ] No known guideline issue is being knowingly shipped.

**STOP CONDITION:** A single unresolved high-risk item means **DO NOT SUBMIT**.

---

# 1. SAFETY

## 1.1 Objectionable Content

### 1.1.1 Defamatory / discriminatory / mean-spirited content
- [ ] Do not target people or groups with defamatory, discriminatory, humiliating, intimidating, or harmful content.
- [ ] Pay particular attention to protected/targeted characteristics such as religion, race, sexual orientation, gender, and national/ethnic origin.
- [ ] Political satire/humor has a specific allowance, but the app still must comply with the remaining rules.

### 1.1.2 Violence / abuse
- [ ] Do not include realistic depictions of people or animals being killed, maimed, tortured, or abused in prohibited ways.
- [ ] Do not encourage violence.
- [ ] In games, fictional enemies must not solely target a real race, culture, government, corporation, or other real entity.

### 1.1.3 Weapons / dangerous objects
- [ ] Do not encourage illegal or reckless use of weapons/dangerous objects.
- [ ] Do not facilitate prohibited firearm or ammunition purchasing.

### 1.1.4 Sexual / pornographic content
- [ ] Do not provide overt pornography or sexually explicit material intended primarily for erotic stimulation.
- [ ] Do not facilitate prostitution, trafficking, exploitation, or similar prohibited sexual activity.
- [ ] Review UGC and social features for pornographic use.

### 1.1.5 Religious content
- [ ] Avoid inflammatory religious commentary.
- [ ] Do not use inaccurate or misleading quotations of religious texts.

### 1.1.6 False information / fake functionality
- [ ] Do not present fake device capabilities or inaccurate device data as real.
- [ ] Do not provide deceptive joke/trick functionality such as fake location tracking.
- [ ] "For entertainment purposes" does not cure deceptive functionality.
- [ ] Anonymous/prank phone call or SMS/MMS functionality can be rejected.

### 1.1.7 Harmful exploitation of current events
- [ ] Do not profit from harmful concepts exploiting recent/current violent conflicts, terrorist attacks, epidemics, or similar events.

---

# 1.2 User-Generated Content (UGC)

If users can post, upload, comment, message, create, stream, or otherwise publish content:

- [ ] Provide objectionable-content filtering/moderation.
- [ ] Provide an in-app reporting mechanism.
- [ ] Respond to reports in a timely manner.
- [ ] Provide user blocking for abusive users.
- [ ] Publish accessible support/contact information.
- [ ] Have an actual moderation process, not merely a UI button.
- [ ] Remove content that violates Apple rules, your terms, or community standards.
- [ ] Have a documented remediation plan for moderation failures.
- [ ] Do not allow the service to become primarily pornographic, random/anonymous-chat, objectifying, threatening, bullying, or similar prohibited use.
- [ ] If web-based UGC can expose incidental mature content, keep it hidden by default and require an appropriate user-controlled mechanism.

**Account-risk warning:** Egregious or repeated UGC moderation failures can lead to app removal and potentially Developer Program removal.

## 1.2.1 Creator Content

If users/creators author content or experiences inside a structured app:

- [ ] Creator content must supplement the native app rather than replace its core native functionality.
- [ ] Treat creator content as UGC and apply UGC moderation.
- [ ] Apply applicable payment rules to paid creator content.
- [ ] Clearly identify content requiring additional purchase.
- [ ] Identify content that exceeds the app's age rating.
- [ ] Use an age restriction mechanism based on verified or declared age to restrict underage access where required.

---

# 1.3 Kids Category

If the app is in the Kids Category:

- [ ] Do not expose links, purchases, or distracting external actions to children except behind a parental gate where permitted.
- [ ] Continue complying with Kids requirements in future versions even if the category is later deselected.
- [ ] Comply with applicable children's privacy laws.
- [ ] Do not send children's personally identifiable/device information to third parties.
- [ ] Avoid third-party analytics and advertising.
- [ ] If limited third-party analytics are used, verify that they do not collect/transmit IDFA or identifiable child/device/location information.
- [ ] If contextual advertising is used, verify age-appropriate creative review and documented Kids practices.
- [ ] Implement parental gates correctly.
- [ ] Do not confuse a parental gate with legally required parental consent.

---

# 1.4 Physical Harm

- [ ] App behavior must not create unreasonable physical risk.

## 1.4.1 Medical apps
- [ ] Accuracy claims must have supporting data and methodology.
- [ ] If accuracy/methodology cannot be validated, do not make the claim.
- [ ] Do not claim device sensors alone can perform unsupported medical measurements such as X-rays, blood pressure, glucose, temperature, oxygen, etc.
- [ ] Encourage appropriate professional medical consultation before medical decisions.
- [ ] If regulatory clearance exists, provide the documentation link to App Review.

## 1.4.2 Drug dosage
- [ ] Drug dosage calculators must come from an appropriately qualified source or have required regulatory approval.
- [ ] Ensure long-term support/update capability.

## 1.4.3 Tobacco / vaping / drugs / alcohol
- [ ] Do not encourage tobacco/vaping, illegal drugs, or excessive alcohol use.
- [ ] Do not encourage minors to use these substances.
- [ ] Do not facilitate prohibited controlled-substance/tobacco sales.

## 1.4.4 DUI / reckless driving
- [ ] DUI checkpoint data must come from law enforcement sources.
- [ ] Do not encourage drunk driving, excessive speed, or reckless behavior.

## 1.4.5 Dangerous activities
- [ ] Do not encourage bets/challenges/device use that risks physical harm.

---

# 1.5 Developer Information

- [ ] App support information is accurate.
- [ ] Support URL provides a practical contact method.
- [ ] Contact details remain current.
- [ ] Wallet passes contain valid issuer contact information.
- [ ] Wallet pass certificates are appropriate for the brand/trademark owner.

---

# 1.6 Data Security

- [ ] Protect collected user information against unauthorized access/use/disclosure.
- [ ] Review every SDK, API, backend, database, logging system, analytics provider, and storage service.
- [ ] Do not expose secrets/API keys in the app binary when they should remain server-side.
- [ ] Use appropriate encryption/security controls for sensitive data.
- [ ] Ensure security behavior is consistent with the privacy policy.

---

# 1.7 Criminal Activity Reporting

- [ ] Apps for reporting alleged criminal activity must involve local law enforcement.
- [ ] Offer such functionality only where the required law-enforcement involvement is active.

---

# 2. PERFORMANCE

## 2.1 App Completeness

### 2.1(a)
- [ ] Submit a final production-quality build.
- [ ] Complete required metadata before submission.
- [ ] All URLs must be functional.
- [ ] Remove placeholder text/content.
- [ ] Remove empty/temporary websites.
- [ ] Test on real supported devices.
- [ ] Test stability and crash behavior.
- [ ] Provide a working demo account for account-based features.
- [ ] Ensure backend services are enabled during review.
- [ ] If a demo account cannot legally/security-wise be provided, obtain Apple's prior approval before using a built-in demo mode.
- [ ] Demo mode must expose full functionality.
- [ ] Never knowingly submit a crashing/incomplete build.

### 2.1(b) In-App Purchases
- [ ] IAP products are complete.
- [ ] IAP metadata is current.
- [ ] IAP products are visible to the reviewer.
- [ ] IAP products are functional.
- [ ] If a configured IAP cannot be discovered, explain exactly why in Review Notes.

---

# 2.2 Beta Testing

- [ ] Do not publish beta/demo/trial versions as normal App Store releases.
- [ ] Use TestFlight for beta distribution.
- [ ] TestFlight builds should be intended for eventual public distribution.
- [ ] TestFlight builds must still comply with App Review Guidelines.
- [ ] Do not compensate TestFlight testers in exchange for testing.
- [ ] Significant beta updates may require TestFlight App Review before distribution.

---

# 2.3 Accurate Metadata

- [ ] App description accurately describes the actual product.
- [ ] Screenshots accurately represent current functionality.
- [ ] App previews accurately represent the actual app.
- [ ] Privacy information is accurate.
- [ ] Metadata stays current after updates.

## 2.3.1 Hidden/dormant functionality
- [ ] No hidden/dormant/undocumented functionality.
- [ ] Every new feature/product change is specifically described in Review Notes.
- [ ] Reviewer can access the feature.
- [ ] Do not market functionality that does not exist.
- [ ] Do not make false pricing claims.
- [ ] Do not attempt to hide functionality from App Review.
- [ ] Repeated/egregious dishonesty can threaten the Developer Program account.

## 2.3.2 IAP disclosure
- [ ] Clearly identify which content/features/subscriptions require additional purchases.
- [ ] IAP display name, screenshot, and description are suitable for public display.
- [ ] Purchase transaction handling is implemented correctly.

## 2.3.3 Screenshots
- [ ] Show the actual app in use.
- [ ] Do not rely only on title art, login screen, or splash screen.
- [ ] Overlays are allowed only when they accurately explain functionality.

## 2.3.4 App previews
- [ ] Use captures of the app itself.
- [ ] Do not fabricate functionality.
- [ ] Narration/text overlays may explain the actual functionality.

## 2.3.5 Category
- [ ] Select the most appropriate App Store category.
- [ ] Do not intentionally select a misleading category.

## 2.3.6 Age rating
- [ ] Complete the age-rating questionnaire honestly.
- [ ] Ensure the rating matches actual content/features.
- [ ] Comply with regional content-rating/warning requirements.

## 2.3.7 Name / keywords / subtitle
- [ ] App name is unique and accurate.
- [ ] Keywords are relevant.
- [ ] Do not stuff metadata with trademarks, popular app names, prices, or irrelevant terms.
- [ ] App name must be within Apple's current character limit.
- [ ] Subtitle must be accurate and not make unverifiable claims.
- [ ] Do not reference competing/other apps improperly.

## 2.3.8 Metadata audience suitability
- [ ] App icon, IAP icons, screenshots, and previews must be appropriate for a 4+ audience.
- [ ] Avoid graphic imagery in metadata.
- [ ] "For Kids"/"For Children" terminology is reserved for the Kids Category.
- [ ] App name/icons/alternate icons should be sufficiently consistent to avoid confusion.

## 2.3.9 Rights in metadata
- [ ] You own or license all images, screenshots, icons, video, trademarks, and other material.
- [ ] Do not use real person's private data in screenshots.
- [ ] Use fictional/demo account data in store assets.

## 2.3.10 Platform focus
- [ ] Metadata focuses on the Apple platform/app being submitted.
- [ ] Do not advertise other mobile platforms or alternative marketplaces unless approved interactive functionality requires it.
- [ ] Remove irrelevant metadata.

## 2.3.11 Pre-order
- [ ] Pre-order app must be complete and deliverable.
- [ ] Released product must not materially differ from what was advertised.
- [ ] Restart pre-order if a material business/product change occurs.

## 2.3.12 What's New
- [ ] Describe significant new features/product changes.
- [ ] Generic wording is acceptable for simple bug fixes/security/performance changes.

## 2.3.13 In-App Events
- [ ] Event type is supported by App Store Connect.
- [ ] Event metadata describes the event, not unrelated app information.
- [ ] Event dates/times are accurate across storefronts.
- [ ] Event deep link opens the correct destination.
- [ ] Event monetization follows Business rules.

---

# 2.4 Hardware Compatibility

## 2.4.1 iPad
- [ ] iPhone apps should run correctly on iPad whenever applicable.
- [ ] Test supported device families.

## 2.4.2 Resource/power safety
- [ ] Avoid excessive battery drain.
- [ ] Avoid excessive heat.
- [ ] Avoid unnecessary resource/SSD strain.
- [ ] Do not run unrelated background processes.
- [ ] No on-device cryptocurrency mining.

## 2.4.3 Apple TV
- [ ] App should work with Siri Remote or supported game controller as appropriate.
- [ ] If a controller is required, disclose it clearly.

## 2.4.4 System settings/restart
- [ ] Never require unnecessary device restart.
- [ ] Do not ask users to disable security protections.
- [ ] Do not ask users to turn off Wi-Fi or modify unrelated system settings.

## 2.4.5 Mac App Store
For macOS apps:
- [ ] Correct sandboxing.
- [ ] Follow macOS file-system rules.
- [ ] Use appropriate APIs for modifying user data.
- [ ] Package with Xcode technologies.
- [ ] No third-party installer.
- [ ] Single self-contained app bundle.
- [ ] No shared-location installation.
- [ ] No unauthorized automatic startup/login execution.
- [ ] No persistent process after quit without consent.
- [ ] No automatic Dock/desktop modifications.
- [ ] Do not install standalone apps/kexts/additional code to materially change reviewed functionality.
- [ ] No root escalation/setuid.
- [ ] No launch-time license key/copy-protection system.
- [ ] Updates through Mac App Store.
- [ ] Support current OS; avoid deprecated/optional technologies.
- [ ] Include localization support in one app bundle.

---

# 2.5 Software Requirements

## 2.5.1 Public APIs
- [ ] Use only public APIs unless Apple explicitly grants an entitlement.
- [ ] Support the currently shipping OS requirements.
- [ ] Remove/replace deprecated APIs when required.
- [ ] Use frameworks for their intended purpose.
- [ ] If a framework integration is significant, accurately describe it.

## 2.5.2 Self-contained code
- [ ] App remains self-contained.
- [ ] Do not read/write outside designated containers without permitted APIs.
- [ ] Do not download/install/execute code that changes app functionality.
- [ ] Educational coding apps have a limited exception when source code is fully viewable/editable and the downloaded code is used for the educational purpose.

## 2.5.3 Malware/harmful code
- [ ] Never transmit/install/execute malware or code capable of harming/disrupting OS/hardware services.
- [ ] Repeat/egregious violations can lead to Developer Program removal.

## 2.5.4 Background execution
- [ ] Use background modes only for their intended Apple-approved purposes.
- [ ] Validate VoIP, audio, location, task completion, local notification, etc. use against Apple's current platform rules.

## 2.5.5 IPv6
- [ ] App is fully functional on IPv6-only networks.
- [ ] Test API calls, DNS, authentication, media, WebSockets, third-party SDKs, and downloads.

## 2.5.6 Web browsers
- [ ] Web-browsing apps use appropriate WebKit APIs.
- [ ] Alternative browser engines require applicable Apple entitlement/permission.

## 2.5.7
- [ ] Intentionally omitted by Apple; no action.

## 2.5.8 Alternative desktop/home screen environments
- [ ] Do not create prohibited alternative desktop/home-screen environments.

## 2.5.9 Native controls
- [ ] Do not alter/disable standard switches or native UI behaviors.
- [ ] Do not block expected navigation into other apps/features without legitimate approved functionality.

## 2.5.10
- [ ] Intentionally omitted by Apple; no action.

## 2.5.11 SiriKit / Shortcuts
- [ ] Register only relevant intents.
- [ ] Intents must be supportable without an unrelated additional app.
- [ ] Vocabulary/plist phrases must relate to the app.
- [ ] Aliases must not be generic or use third-party app names/services.
- [ ] Resolve requests directly.
- [ ] Do not insert advertising/marketing between request and fulfillment.
- [ ] Ask clarification only when necessary.

## 2.5.12 CallKit / SMS Fraud Extension
- [ ] Block only confirmed spam numbers.
- [ ] Clearly disclose call/SMS/MMS blocking/spam-identification features.
- [ ] Explain blocked/spam-list criteria.
- [ ] Do not use data from these APIs for unrelated tracking/profiling/sale.

## 2.5.13 Facial recognition authentication
- [ ] Use LocalAuthentication for account authentication where possible.
- [ ] Do not replace the appropriate system authentication with inappropriate facial-recognition APIs.
- [ ] Provide an alternate authentication method for users under 13.

## 2.5.14 Recording/logging user activity
- [ ] Obtain explicit user consent when recording/logging user activity.
- [ ] Provide clear visual and/or audible indication.
- [ ] Applies to camera, microphone, screen recording, and other user-input recording.

## 2.5.15 Files
- [ ] File-selection functionality should include Files app and iCloud documents where applicable.

## 2.5.16 Widgets/extensions/notifications
- [ ] Widgets/extensions/notifications must relate to app content/functionality.
- [ ] App Clip functionality must also exist in the main app binary.
- [ ] App Clips cannot contain advertising.

## 2.5.17 Matter
- [ ] Use Apple's Matter support framework to initiate pairing.
- [ ] Non-Apple Matter components must have required Connectivity Standards Alliance certification for the platform.

## 2.5.18 Advertising
- [ ] Display ads primarily in the main app binary, not prohibited extensions/App Clips/widgets/notifications/keyboards/watchOS apps.
- [ ] Ads must fit the app's age rating.
- [ ] Users must be able to see targeting information as required without leaving the app.
- [ ] Do not target based on sensitive data such as health/medical, school/classroom, or Kids-category data.
- [ ] Interstitial ads must clearly be ads.
- [ ] Ads must not trick users into tapping.
- [ ] Provide visible, sufficiently large close/skip controls.
- [ ] Provide a way to report inappropriate/age-inappropriate ads.

---

# 3. BUSINESS

## General
- [ ] Business model is understandable from metadata and Review Notes.
- [ ] Pricing is not an irrational/abusive rip-off.
- [ ] Never manipulate ratings, reviews, rankings, impressions, clicks, or discovery.
- [ ] Never pay/engage third parties to manipulate App Store feedback/discovery.

---

# 3.1 Payments

## 3.1.1 In-App Purchase
For digital goods/features/content/subscriptions/functionality:
- [ ] Use Apple's In-App Purchase mechanism unless a documented exception applies.
- [ ] Do not use license keys, QR codes, cryptocurrency, wallets, or other mechanisms to unlock digital functionality where IAP is required.
- [ ] Tipping digital content providers can use IAP currency where allowed.
- [ ] Purchased credits/in-game currency must not expire.
- [ ] Restorable IAP must have a restore mechanism.
- [ ] Gifts of eligible IAP items are allowed only under Apple's conditions.
- [ ] Loot boxes/randomized paid virtual items must disclose odds before purchase.
- [ ] Digital gift cards/vouchers/coupons redeemable for digital goods/services must use IAP.
- [ ] Physical gift cards shipped to customers may use non-IAP payment.
- [ ] Non-subscription apps may use the specific free trial pattern Apple permits for a Price Tier 0 non-consumable IAP, with clear duration, lost access, and later charges.
- [ ] NFT-related services such as mint/list/transfer may use IAP where allowed.
- [ ] NFT ownership may not unlock app functionality merely because the user owns the NFT.
- [ ] Review regional rules for NFT purchase links.

## 3.1.1(a) External purchase links / entitlements
- [ ] Determine storefront/region before using external purchase links.
- [ ] If an entitlement is required, obtain and implement the correct entitlement.
- [ ] Follow the entitlement agreement exactly.
- [ ] Do not use an entitlement outside its permitted storefront/use case.
- [ ] Do not use misleading marketing, scams, or fraud around external purchase options.

## 3.1.2 Subscriptions
### 3.1.2(a)
- [ ] Subscription provides ongoing value.
- [ ] Subscription period is at least 7 days.
- [ ] Subscription works across the user's supported devices.
- [ ] SaaS/cloud/media/content subscriptions may be appropriate where value is continuous.
- [ ] Avoid duplicate subscription charges.
- [ ] Users must receive paid value without forced unrelated actions.
- [ ] Subscription may contain consumable credits where permitted.
- [ ] Do not remove primary functionality previously purchased when changing business model.
- [ ] Free trials must use the appropriate App Store Connect subscription mechanisms.
- [ ] Never use bait-and-switch/scam subscription flows.
- [ ] Mobile-carrier bundles require applicable Apple approval and rules.

### 3.1.2(b) Upgrades/downgrades
- [ ] Upgrade/downgrade is seamless.
- [ ] Prevent accidental duplicate subscription variants.
- [ ] Correctly configure subscription groups and levels.

### 3.1.2(c) Subscription information
Before purchase:
- [ ] Explain what the user receives.
- [ ] State price.
- [ ] State renewal period.
- [ ] State relevant limits/benefits.
- [ ] Clearly communicate required subscription terms.

## 3.1.3 Other purchase methods

### 3.1.3(a) Reader apps
Eligible reader apps may access previously purchased:
- magazines
- newspapers
- books
- audio
- music
- video

Checklist:
- [ ] Confirm the app actually qualifies as a reader app.
- [ ] Existing account access is handled correctly.
- [ ] External account-link entitlements are used when required.
- [ ] Regional rules are checked.

### 3.1.3(b) Multi-platform services
- [ ] Users may access purchases made on other platforms/website where Apple permits it.
- [ ] Where required, equivalent digital items must also be available as IAP.
- [ ] Do not assume a website subscription automatically qualifies for an exception.

### 3.1.3(c) Enterprise services
- [ ] App is sold directly to organizations/groups for employees/students.
- [ ] Previously purchased enterprise content may be accessible.
- [ ] Consumer/single-user/family purchases generally require IAP.

### 3.1.3(d) Person-to-person services
- [ ] Real-time one-to-one services may use non-IAP payment.
- [ ] Examples include tutoring, medical consultation, property tours, fitness training.
- [ ] One-to-few and one-to-many real-time services require IAP.

### 3.1.3(e) Physical goods/services outside app
- [ ] Physical goods/services consumed outside the app use non-IAP payment.
- [ ] Apple Pay/card payment may be used where appropriate.

### 3.1.3(f) Free stand-alone companion apps
- [ ] Free app may accompany a paid web tool such as VoIP/cloud storage/email/web hosting.
- [ ] No purchase inside the app.
- [ ] No external purchase call-to-action inside the app.

### 3.1.3(g) Advertising management
- [ ] Sole purpose must be advertiser campaign management.
- [ ] App may manage campaigns across media.
- [ ] App must not simply display those advertisements.
- [ ] Digital advertising purchased for consumption inside an app may require IAP.

## 3.1.4 Hardware-specific content
- [ ] Hardware-dependent functionality may have specific exceptions.
- [ ] Optional physical-product functionality may be unlocked under Apple's conditions.
- [ ] Do not require unrelated product purchases/marketing actions to unlock app features.

## 3.1.5 Cryptocurrencies

### Wallets
- [ ] Cryptocurrency wallet apps must meet Apple's organizational enrollment requirement.

### Mining
- [ ] No on-device cryptocurrency mining.
- [ ] Off-device/cloud processing may be permitted subject to other rules.

### Exchanges
- [ ] Exchange functionality requires appropriate licensing/permissions in each supported region.
- [ ] Use approved exchanges where required.

### ICOs / crypto securities
- [ ] ICO/futures/crypto-security/quasi-security trading must come from appropriately regulated financial institutions and comply with law.

### Task rewards
- [ ] Do not reward cryptocurrency for downloading apps, recruiting users, social posting, etc.

---

# 3.2 Other Business Model Issues

## 3.2.1 Acceptable examples
- [ ] Own-app promotion is allowed when the app has substantive purpose beyond being a catalogue.
- [ ] Third-party app recommendations need a specific approved purpose and robust editorial value.
- [ ] Rental content can expire where permitted.
- [ ] Wallet passes can support approved payment/offer/identification use cases.
- [ ] Insurance apps must be free, lawful, and not use IAP.
- [ ] Approved non-profits may fundraise under Apple's conditions, including required Apple Pay support and legal/tax disclosures.
- [ ] Optional monetary gifts between individuals may avoid IAP only under Apple's exact conditions; gifts tied to digital content/services require IAP.
- [ ] Financial trading/investing/money-management apps should be submitted by the relevant licensed financial institution and have required permissions.

## 3.2.2 Unacceptable
- [ ] Do not build a general third-party app/extension/plugin store interface.
- [ ] Do not artificially increase ad impressions/clicks.
- [ ] Do not make an app primarily an ad-display product unless compliant with applicable rules.
- [ ] Do not collect charity/fundraiser money inside the app unless an allowed exception applies.
- [ ] Do not arbitrarily restrict users by location/network provider.
- [ ] Do not manipulate another service's visibility/status/rank unless its terms allow it.
- [ ] Binary-options trading apps are prohibited.
- [ ] CFD/FOREX/derivative apps require proper licensing in all supported jurisdictions.
- [ ] Personal-loan apps must disclose required loan terms and meet Apple's current APR/repayment restrictions.
- [ ] Do not force ratings, reviews, downloads, or store actions to unlock app functionality/content.

---

# 4. DESIGN

## 4.1 Copycats

### 4.1(a)
- [ ] App must have original value.
- [ ] Do not clone another popular app with minor changes.
- [ ] Avoid confusingly similar names/UI/branding.

### 4.1(b)
- [ ] Do not impersonate another app/service.
- [ ] Treat impersonation as a serious Developer Code of Conduct risk.

### 4.1(c)
- [ ] Do not use another developer's icon, brand, or product name in your app icon/name without permission.

---

# 4.2 Minimum Functionality

- [ ] App provides meaningful native utility/entertainment.
- [ ] App is more than a repackaged website.
- [ ] App has sufficient lasting value.
- [ ] Do not submit simple media/books that belong in Apple's other content stores.

### 4.2.1 ARKit
- [ ] ARKit apps must provide a meaningful integrated AR experience.
- [ ] Merely placing a model/animation in AR is insufficient.

### 4.2.2 Marketing/web clipping
- [ ] App should not primarily be marketing material, advertisements, web clipping, generic aggregation, or a link collection.
- [ ] Catalogues are treated separately.

### 4.2.3 Standalone behavior
- [ ] App should work without requiring another app.
- [ ] If additional resources are required at first launch, disclose download size and ask before downloading.

### 4.2.4 / 4.2.5
- [ ] Intentionally omitted by Apple; no action.

### 4.2.6 Templates/app-generation services
- [ ] Commercial templates/app generators are restricted.
- [ ] Provider should not submit generic client apps on behalf of clients where Apple prohibits it.
- [ ] Client apps need meaningful customization/unique experiences.
- [ ] Aggregated/picker models may be acceptable in qualifying scenarios.

### 4.2.7 Remote Desktop
If applicable:
- [ ] Connect only to a user-owned personal computer/dedicated game console as required.
- [ ] Host/client must meet local/LAN requirements where specified.
- [ ] Software executes/renders on host.
- [ ] Account creation/management starts on host.
- [ ] Client UI must not become an iOS/App Store-like software store.
- [ ] Do not allow browsing/selecting/purchasing unowned software.
- [ ] Host-side transactions can follow the host environment's rules.
- [ ] Do not submit a prohibited thin client for cloud-based apps.

---

# 4.3 Spam

### 4.3(a)
- [ ] Do not create multiple Bundle IDs for substantially the same app.
- [ ] Prefer a single configurable app where appropriate.
- [ ] Location/team/university variants should not be mass-produced as separate apps without a legitimate reason.

### 4.3(b)
- [ ] Do not submit indistinguishable clones of common apps.
- [ ] Established categories require meaningful differentiation/improvement.
- [ ] Low-quality/repeated submissions can become a Developer Program risk.

---

# 4.4 Extensions

- [ ] Follow the applicable App Extension/Safari extension documentation.
- [ ] Provide useful extension functionality.
- [ ] Clearly disclose extensions in marketing text.
- [ ] Extensions must not contain prohibited marketing/advertising/IAP.

## 4.4.1 Keyboard extensions
Must:
- [ ] Provide keyboard input.
- [ ] Follow Sticker rules if using images/emoji.
- [ ] Provide keyboard-switch/navigation mechanism.
- [ ] Remain functional without full network access/full access.
- [ ] Collect user activity only to improve keyboard functionality on-device.

Must not:
- [ ] Launch arbitrary apps; Settings is the permitted special case.
- [ ] Repurpose keyboard buttons for unrelated actions.

## 4.4.2 Safari extensions
- [ ] Work with current Safari/OS.
- [ ] Do not interfere with system/Safari UI.
- [ ] No malicious/misleading content/code.
- [ ] Request only website access necessary for operation.
- [ ] Violations can threaten Developer Program membership.

## 4.4.3
- [ ] Intentionally omitted.

---

# 4.5 Apple Sites and Services

## 4.5.1 Apple data/sites
- [ ] Approved Apple RSS feeds may be used where permitted.
- [ ] Do not scrape Apple websites/services such as App Store, App Store Connect, developer portal, etc.
- [ ] Do not build rankings from prohibited scraped Apple information.

## 4.5.2 Apple Music
- [ ] Playback must be user-initiated.
- [ ] Provide standard media controls.
- [ ] Do not require payment or indirectly monetize access to Apple Music service.
- [ ] Do not download/upload/share MusicKit-sourced music outside allowed functionality.
- [ ] Obtain necessary music licenses for deeper integrations.
- [ ] Do not misuse cover art/metadata in marketing.
- [ ] Disclose Apple Music data access in purpose strings.
- [ ] Do not share Apple Music user data for unrelated purposes.
- [ ] Do not use Apple Music data for user/device identification or targeted advertising.

## 4.5.3 Apple services abuse
- [ ] Do not spam/phish users using Game Center, Push Notifications, Live Activities, etc.
- [ ] Do not reverse lookup/trace/harvest/exploit Game Center IDs/aliases.
- [ ] Violations can lead to Developer Program removal.

## 4.5.4 Push Notifications
- [ ] Push must not be required for core app functionality.
- [ ] Do not send sensitive/confidential information improperly.
- [ ] Promotional/direct-marketing push requires explicit opt-in.
- [ ] Provide an in-app opt-out mechanism.
- [ ] Do not abuse Apple push services.

## 4.5.5 Game Center IDs
- [ ] Use Player IDs only as permitted by Game Center terms.
- [ ] Do not expose them to users/third parties improperly.

## 4.5.6 Apple emoji
- [ ] Unicode characters that render as Apple emoji can be used where permitted.
- [ ] Do not embed Apple emoji assets directly into the binary or use them on other platforms in prohibited ways.

## 4.6
- [ ] Intentionally omitted.

---

# 4.7 Mini Apps / Mini Games / Streaming Games / Chatbots / Plug-ins / Emulators

If the app provides software not embedded in its binary:

- [ ] Verify that the software category is one Apple permits.
- [ ] Developer is responsible for all offered software.
- [ ] Every offered software experience must comply with Apple's guidelines and law.
- [ ] Apply additional 4.7 requirements.

## 4.7.1
- [ ] Apply all privacy requirements.
- [ ] Moderate objectionable content.
- [ ] Provide reporting and timely response.
- [ ] Provide blocking.
- [ ] Apply payment rules to digital goods/services.

## 4.7.2
- [ ] Do not expose/extend native platform APIs/technologies to remote/non-embedded software without Apple's permission.

## 4.7.3
- [ ] Do not share data or privacy permissions with individual offered software without explicit user consent each time.

## 4.7.4
- [ ] Provide an index/catalog of offered software and metadata.
- [ ] Provide universal links to offered software.

## 4.7.5
- [ ] Identify software exceeding the app's age rating.
- [ ] Restrict underage users using verified/declared age mechanisms as required.

---

# 4.8 Login Services

If using third-party/social login to establish/authenticate the primary account:

- [ ] Provide an equivalent alternative login meeting Apple's privacy criteria.
- [ ] Alternative service limits collection to name/email.
- [ ] Alternative service allows private email.
- [ ] Alternative service does not use app interactions for advertising without consent.

### Exceptions
No equivalent-login requirement when:
- [ ] App uses only its own account system.
- [ ] App is an alternative marketplace or distributed through one and uses its marketplace-specific account system.
- [ ] App is an education/enterprise/business app requiring an existing organization account.
- [ ] App uses government/industry-backed citizen ID/eID.
- [ ] App is a client for a specific third-party service and direct third-party account login is required for the service.

---

# 4.9 Apple Pay

- [ ] Show material purchase information before sale.
- [ ] Use Apple Pay branding/UI correctly.
- [ ] For recurring Apple Pay payments, disclose:
  - [ ] Renewal duration
  - [ ] Auto-renewal until cancellation
  - [ ] What the user receives
  - [ ] Actual charge
  - [ ] Cancellation method

---

# 4.10 Monetizing Built-In Capabilities

- [ ] Do not sell access to built-in hardware capabilities as if they were Apple's service.
- [ ] Do not monetize Push Notifications, camera, gyroscope, etc. as standalone built-in capabilities.
- [ ] Do not monetize Apple services/technologies such as Apple Music access, iCloud storage, or Screen Time APIs in prohibited ways.

---

# 5. LEGAL

## General
- [ ] Comply with laws in every country/region where the app is available.
- [ ] Obtain legal review for regulated/high-risk products.
- [ ] Do not solicit/promote/encourage criminal or clearly reckless conduct.
- [ ] Understand that Apple may involve authorities in extreme illegal/exploitation cases.

---

# 5.1 Privacy

## 5.1.1 Data Collection and Storage

### (i) Privacy Policy
- [ ] Privacy Policy URL exists in App Store Connect.
- [ ] Privacy Policy is accessible inside the app.
- [ ] Explain what data is collected.
- [ ] Explain how data is collected.
- [ ] Explain all uses.
- [ ] Identify relevant third parties receiving data.
- [ ] Require third parties to provide equivalent protection as stated.
- [ ] Explain retention/deletion.
- [ ] Explain consent withdrawal.
- [ ] Explain how users request deletion.

### (ii) Permission
- [ ] Obtain required user consent for user/usage data collection.
- [ ] Do not require unnecessary data permission as a condition of paid functionality.
- [ ] Provide an understandable way to withdraw consent where applicable.
- [ ] Purpose strings must accurately and completely explain data use.
- [ ] If relying on GDPR legitimate-interest grounds, satisfy the legal requirements.

### (iii) Data minimization
- [ ] Request only data needed for the app's core task.
- [ ] Prefer system pickers/share sheets over broad protected-resource access where possible.
- [ ] Avoid collecting unnecessary Photos/Contacts/location/etc.

### (iv) Permission access
- [ ] Respect denied permissions.
- [ ] Do not manipulate/trick users into unnecessary permissions.
- [ ] Provide alternative functionality where reasonably possible.

### (v) Account sign-in
- [ ] If significant account features do not exist, consider allowing use without login.
- [ ] If account creation exists, provide in-app account deletion.
- [ ] Do not require irrelevant personal information.
- [ ] If social-network integration is not core functionality, provide access without requiring social login where applicable.
- [ ] Provide social credential revocation/data-access disabling when required.
- [ ] Do not store social-network credentials/tokens off-device in prohibited ways.

### (vi) Password/private-data discovery
- [ ] Never use the app to secretly discover passwords or private data.

### (vii) SafariViewController
- [ ] Present SafariViewController visibly.
- [ ] Do not hide/overlay it.
- [ ] Do not use it to track users without knowledge/consent.

### (viii) Personal information compilation
- [ ] Do not compile personal information from sources other than the user without explicit consent, even when information is publicly available.

### (ix) Highly regulated fields
- [ ] Banking/financial services, healthcare, gambling, legal cannabis, air travel, crypto exchanges, and similar sensitive regulated services require special attention.
- [ ] Such apps should be submitted by the legal entity actually providing the service where Apple requires.
- [ ] Obtain licenses/permissions.
- [ ] Geo-restrict legal cannabis sales to authorized jurisdictions.

### (x) Basic contact information
- [ ] Name/email collection may be optional where permitted.
- [ ] Features should not be conditional on optional contact information.
- [ ] Continue complying with children's privacy rules.

---

# 5.1.2 Data Use and Sharing

### (i)
- [ ] Obtain permission before using/transmitting/sharing personal data unless law provides a valid exception.
- [ ] Tell users how/where data is used.
- [ ] Clearly disclose third-party data sharing.
- [ ] Explicitly disclose third-party AI data sharing.
- [ ] Obtain explicit permission before sharing personal data with third-party AI where required.
- [ ] Use ATT when tracking activity requires it.
- [ ] Do not require push/location/tracking system functionality as a condition for app access or compensation.
- [ ] Unauthorized sharing can result in app removal and potentially Developer Program removal.

### (ii)
- [ ] Do not repurpose data collected for one purpose for a different purpose without additional consent unless legally permitted.

### (iii)
- [ ] Do not secretly build profiles.
- [ ] Do not identify anonymous users.
- [ ] Do not reconstruct identities/profiles from Apple-provided or claimed-anonymized data.

### (iv)
- [ ] Do not turn Contacts/Photos/user-data APIs into a contact database for your own sale/distribution.
- [ ] Do not collect installed-app information for analytics/advertising/marketing.

### (v)
- [ ] Do not contact people using Contacts/Photos data except through the user's explicit individualized action.
- [ ] No "Select All" or default-all contact selection.
- [ ] Explain to the user what message will be sent, who sends it, and how it appears.

### (vi) Sensitive Apple APIs
Data from:
- HomeKit
- HealthKit
- Clinical Health Records
- MovementDisorder APIs
- ClassKit
- depth/facial mapping tools

must not be used for marketing, advertising, or use-based data mining, including by third parties.

### (vii) Apple Pay data
- [ ] Apple Pay-derived user data may only be shared with third parties for permitted delivery/improvement of goods/services.

---

# 5.1.3 Health and Health Research

- [ ] Treat health/fitness/medical data as highly sensitive.
- [ ] Do not use/disclose protected health data for advertising/marketing/use-based mining.
- [ ] Health research use requires appropriate permission and rules.
- [ ] Health data may support a direct user benefit only under Apple's conditions.
- [ ] Disclose specific health data collected.
- [ ] Do not write false/inaccurate health data to HealthKit or medical research/management apps.
- [ ] Do not store personal health information in iCloud where prohibited.

### Human-subject health research
- [ ] Obtain participant consent.
- [ ] For minors, obtain parent/guardian consent.
- [ ] Consent explains nature, purpose, duration.
- [ ] Explain procedures, risks, benefits.
- [ ] Explain confidentiality/data sharing.
- [ ] Provide contact for participant questions.
- [ ] Explain withdrawal.
- [ ] Obtain independent ethics review-board approval.
- [ ] Provide proof of approval when requested.

---

# 5.1.4 Kids

- [ ] Review COPPA, GDPR, and all applicable children's privacy laws.
- [ ] Only ask for date of birth/parent contact when needed for legal compliance.
- [ ] App still provides useful functionality/entertainment regardless of age.
- [ ] Avoid third-party analytics/ads for primarily kids apps.
- [ ] Limited exceptions must satisfy Apple's Kids requirements.
- [ ] Kids-category or apps handling minors' personal information need appropriate privacy policy/legal compliance.
- [ ] Parental gate is not the same as legal parental consent.
- [ ] Non-Kids apps must not use metadata suggesting children are the primary audience.

---

# 5.1.5 Location Services

- [ ] Use location only when directly relevant to app functionality.
- [ ] Do not use location APIs for prohibited emergency/autonomous-control purposes.
- [ ] Tell users why location is needed.
- [ ] Obtain consent before collecting/transmitting/using location.
- [ ] Provide an understandable location purpose explanation.

---

# 5.2 Intellectual Property

## General
- [ ] Own or license all content.
- [ ] Do not use copyrighted/trademarked/patented material without permission.
- [ ] App/developer identity should accurately represent the rights holder/licensee.
- [ ] Avoid copycat representations.

## 5.2.1 Third-party IP
- [ ] Do not use protected third-party trademarks/copyrights/patents without rights.
- [ ] Do not use misleading names/metadata.
- [ ] App should be submitted by the person/entity owning or licensing relevant rights.

## 5.2.2 Third-party sites/services
- [ ] Review the service's Terms of Use.
- [ ] Obtain explicit authorization when required.
- [ ] Be able to provide proof to App Review.

## 5.2.3 Audio/video downloading
- [ ] Do not facilitate illegal media sharing.
- [ ] Do not download/convert/save third-party media without authorization.
- [ ] Verify streaming/API terms before integrating services such as YouTube, SoundCloud, Vimeo, etc.
- [ ] Keep authorization evidence.

## 5.2.4 Apple endorsements
- [ ] Do not imply Apple supplies, endorses, sponsors, or guarantees your app.
- [ ] Do not misuse Editor's Choice/Apple badges.

## 5.2.5 Apple products
- [ ] Do not create a confusing imitation of Apple products/UI/apps/advertising themes.
- [ ] Do not use Apple emoji in prohibited app assets/binaries.
- [ ] Follow Apple Music preview rules.
- [ ] Do not misuse Activity Rings.
- [ ] Follow WeatherKit attribution requirements when displaying Apple Weather data.

---

# 5.3 Gaming, Gambling and Lotteries

- [ ] Fully assess licensing/legal requirements before adding gambling/lottery functionality.

### 5.3.1
- [ ] Sweepstakes/contests must be sponsored by the developer.

### 5.3.2
- [ ] Official rules must be shown in the app.
- [ ] Rules must state Apple is not a sponsor or participant.

### 5.3.3
- [ ] Do not use IAP to buy credits/currency for real-money gambling.

### 5.3.4
- [ ] Real-money gambling/lottery apps require licenses/permissions.
- [ ] Geo-restrict to authorized locations.
- [ ] App must be free where Apple's rule requires.
- [ ] Illegal gambling aids are prohibited.
- [ ] Lottery requires consideration, chance, and prize.

---

# 5.4 VPN Apps

- [ ] Use NEVPNManager as required.
- [ ] Developer must be enrolled as an organization.
- [ ] Before use/purchase, clearly disclose data collection/use.
- [ ] Do not sell/use/disclose VPN data to third parties.
- [ ] Privacy policy must commit to the required data restrictions.
- [ ] Follow local VPN licensing laws.
- [ ] Provide license information in Review Notes where required.
- [ ] Approved parental-control/content-blocking/security apps may have applicable entitlement/use cases.
- [ ] Violations can lead to removal and Developer Program consequences.

---

# 5.5 Mobile Device Management (MDM)

- [ ] Request Apple's required MDM capability.
- [ ] App must fit an allowed provider category: commercial enterprise, education, government, or limited approved parental/device-security cases.
- [ ] Before use/purchase, clearly disclose data collection/use.
- [ ] Do not sell/use/disclose MDM data to third parties.
- [ ] Privacy policy must contain the required commitment.
- [ ] Limited analytics exceptions must be restricted to MDM app performance and not user/device/other-app data.
- [ ] Configuration-profile apps must also follow these rules.
- [ ] Violations can lead to removal and Developer Program consequences.

---

# 5.6 Developer Code of Conduct

## 5.6 General
- [ ] Treat App Review, customers, and support contacts respectfully.
- [ ] No harassment, discrimination, intimidation, or bullying.
- [ ] No manipulative, misleading, or fraudulent behavior.
- [ ] Do not trick users into unwanted purchases.
- [ ] Do not force unnecessary data sharing.
- [ ] Do not deceptively raise prices.
- [ ] Do not charge for undelivered functionality/content.
- [ ] Maintain customer trust.

**Account risk:** Apple states that Developer Program accounts can be terminated for conduct/actions violating the Code of Conduct. Apple may allow restoration after a written improvement plan is reviewed and changes are confirmed.

## 5.6.1 App Store Reviews
- [ ] Respond respectfully.
- [ ] Keep responses relevant to the user's comment.
- [ ] Do not include personal information, spam, or marketing.
- [ ] Use Apple's provided review-prompt API.
- [ ] Do not build custom review prompts intended to bypass Apple's review experience.

## 5.6.2 Developer Identity
- [ ] Developer/business identity is truthful.
- [ ] Business information is verifiable.
- [ ] Offerings are accurately represented.
- [ ] Keep contact/business information current.

## 5.6.3 Discovery Fraud
- [ ] Never manipulate App Store charts.
- [ ] Never manipulate search ranking.
- [ ] Never manipulate reviews/ratings.
- [ ] Never manipulate referrals/discovery.
- [ ] Do not use paid/fake/incentivized/automated discovery manipulation.

## 5.6.4 App Quality
- [ ] Monitor customer complaints.
- [ ] Monitor excessive negative reports.
- [ ] Monitor excessive refund requests.
- [ ] Maintain product/service quality.
- [ ] Repeated quality failures can become a Developer Code of Conduct issue.

---

# 6. APP REVIEW OPERATIONS

## Before submission

- [ ] Test for crashes.
- [ ] Test major user journeys.
- [ ] Verify metadata.
- [ ] Verify support/contact information.
- [ ] Provide demo account or approved demo mode.
- [ ] Ensure backend is live.
- [ ] Explain non-obvious functionality.
- [ ] Explain IAP/subscription flows.
- [ ] Provide sample QR codes/hardware/resources if required.
- [ ] Ensure reviewer can reach every relevant feature.
- [ ] Remove development/test/debug UI.
- [ ] Remove fake/test advertisements.
- [ ] Remove placeholder data.
- [ ] Verify all external links.
- [ ] Verify login, OTP, CAPTCHA, email verification, and password reset.
- [ ] Verify region/storefront behavior.
- [ ] Verify subscription and purchase restoration.
- [ ] Verify account deletion.
- [ ] Verify privacy controls.

## Review Notes template

Include:
- Test account username/email
- Test account password
- OTP instructions or reviewer-safe test path
- CAPTCHA/human verification instructions or approved bypass
- Required subscription/test product
- Navigation steps
- Special hardware
- QR/barcode sample
- Region requirements
- Backend status
- Explanation of unusual/non-obvious features
- Any known limitation with exact reproduction and explanation

**Never provide fake or misleading review information.**

---

# 7. ACCOUNT-PROTECTION / ZERO-TRUST RULES

These are especially important if the goal is to protect the Apple Developer Program account.

## NEVER do these

- [ ] Never hide functionality from App Review.
- [ ] Never provide a review build that behaves materially differently from the public build for deceptive reasons.
- [ ] Never falsify screenshots/metadata.
- [ ] Never fake user reviews.
- [ ] Never buy/manipulate ratings.
- [ ] Never manipulate charts/search/referrals.
- [ ] Never submit copycat/impersonating apps.
- [ ] Never use another developer's brand/name/icon without authorization.
- [ ] Never submit malware or harmful code.
- [ ] Never secretly collect credentials/passwords.
- [ ] Never intentionally violate privacy rules.
- [ ] Never misrepresent the app's business model.
- [ ] Never use prohibited payment workarounds.
- [ ] Never repeatedly submit an unchanged rejected issue.
- [ ] Never knowingly ship illegal functionality.
- [ ] Never use a third-party SDK without reviewing its data collection/behavior.
- [ ] Never assume "the SDK vendor is responsible"; Apple states the developer is responsible for integrated third-party SDK behavior.
- [ ] Never create an app solely to game App Store discovery.
- [ ] Never use automation to manipulate Apple review.

---

# 8. AI DEVELOPER PRE-SUBMISSION PROTOCOL

The AI coding agent must treat this document as a **release gate**, not as informational documentation.

## Required workflow

### STEP 1 — Inventory the app

Generate:

```text
App type:
Target platforms:
Target OS versions:
Primary audience:
Kids Category?:
Account/login?:
UGC?:
Creator content?:
Subscriptions?:
IAP?:
External payments?:
Physical goods/services?:
Health data?:
Location?:
Camera?:
Microphone?:
Contacts?:
Photos?:
Tracking/ATT?:
Third-party/social login?:
Apple Pay?:
Apple Music?:
HealthKit?:
HomeKit?:
ARKit?:
CallKit?:
SMS extension?:
VPN?:
MDM?:
Crypto?:
Gambling?:
AI/LLM/third-party AI?:
Mini-apps/remote code?:
Browser/WebKit?:
Extensions/widgets/App Clips?:
Ads?:
Push notifications?:
```

### STEP 2 — Determine applicable guidelines

The AI must map every applicable feature to guideline numbers.

Example:

```text
Google Sign-In -> 4.8
Subscription -> 3.1.2
Stripe digital subscription -> 3.1.1 / 3.1.3 analysis
User-generated chat -> 1.2 + 5.1
Camera -> 5.1.1 + permission rules
Third-party AI -> 5.1.2(i)
Account creation -> 5.1.1(v)
Account deletion -> 5.1.1(v)
Ads -> 2.5.18
```

### STEP 3 — Scan source code/configuration

Search for:
- Payment SDKs
- StoreKit
- Stripe/Razorpay/PayPal/etc.
- Firebase/Analytics
- Sentry/Crashlytics
- Facebook/Meta SDK
- Google SDKs
- AI APIs
- Camera/microphone/location
- Contacts/Photos
- HealthKit
- Push notifications
- tracking/ATT
- WebViews
- remote code
- JavaScript execution
- downloaded scripts/content
- social login
- VPN/MDM
- crypto
- ads
- subscription logic
- account deletion
- data export
- consent
- privacy policy
- age gates
- moderation/report/block systems

### STEP 4 — Perform a privacy SDK audit

For every SDK:

```text
SDK:
Vendor:
Purpose:
Data collected:
Data transmitted:
Third parties:
Tracking?:
Advertising?:
Sensitive data?:
AI data sharing?:
Required consent?:
Privacy Policy disclosure?:
App Store Privacy disclosure?:
ATT required?:
Apple guideline mapping:
```

### STEP 5 — Perform a payment audit

For every paid feature:

```text
Feature:
Digital or physical:
Where consumed:
Purchase location:
Payment provider:
IAP product ID:
StoreKit implementation:
Restore mechanism:
Subscription duration:
Price disclosure:
Regional exception:
Entitlement required:
Apple approval obtained:
```

If digital content is sold outside IAP without a clearly applicable Apple exception, **BLOCK RELEASE**.

### STEP 6 — Perform reviewer-access test

Fresh installation:

```text
Install
→ Launch
→ Login
→ CAPTCHA/human verification
→ OTP
→ Main feature
→ Premium feature
→ Purchase
→ Restore
→ Logout
→ Delete account
```

Repeat on supported iPhone/iPad configurations.

### STEP 7 — Metadata audit

Compare:
- App binary
- App Store description
- Screenshots
- App previews
- App name
- subtitle
- keywords
- age rating
- privacy disclosures
- IAP descriptions
- What's New
- Review Notes

If any material mismatch exists: **BLOCK RELEASE**.

### STEP 8 — Final security/reputation audit

Search for:
- hard-coded secrets
- test credentials
- debug menus
- staging URLs
- hidden admin routes
- review-only logic
- fake review prompts
- analytics misuse
- undocumented remote configuration
- prohibited APIs
- unauthorized copyrighted assets
- copied UI
- deceptive functionality

### STEP 9 — Generate a compliance report

The AI must produce:

```text
APPLE RELEASE COMPLIANCE REPORT

Status: PASS / BLOCKED

Critical findings:
High findings:
Medium findings:
Low findings:

Applicable guidelines:
[guideline -> evidence -> result]

Payment compliance:
Privacy compliance:
Account/deletion compliance:
Review access:
Metadata:
Third-party SDKs:
Security:
Legal/IP:
Device compatibility:

BLOCKING ISSUES:
1.
2.
3.

Recommended fixes:
1.
2.
3.
```

**The AI must not say "Apple will approve this."**
It may say:
- `No known blocking issue found from the checked criteria`
- `Potential Apple Review risk`
- `Requires Apple clarification/entitlement`
- `Legal review required`

---

# 9. SPECIAL TEST MATRIX

At minimum, test:

| Area | Test |
|---|---|
| Install | Clean install |
| Upgrade | Existing-user update |
| Launch | Cold launch |
| Network | Online |
| Network | Offline |
| Network | Slow network |
| Network | IPv6-only |
| Auth | New account |
| Auth | Existing account |
| Auth | Wrong password |
| Auth | Expired session |
| Auth | OTP |
| Auth | CAPTCHA |
| Auth | Social login |
| Privacy | Permission granted |
| Privacy | Permission denied |
| Privacy | Permission revoked |
| Purchase | Buy |
| Purchase | Restore |
| Purchase | Cancel |
| Purchase | Expired subscription |
| Account | Logout |
| Account | Delete |
| UGC | Post |
| UGC | Report |
| UGC | Block |
| UGC | Moderation |
| Ads | Normal ad |
| Ads | Close/skip |
| Push | Permission denied |
| Push | Marketing opt-out |
| iPad | Portrait |
| iPad | Landscape |
| Accessibility | Dynamic text |
| Accessibility | VoiceOver |
| Crash | Force/edge cases |
| Background | App resume |
| Security | Staging/debug disabled |

---

# 10. RELEASE DECISION

## PASS

Only when:

- [ ] Every applicable Apple guideline has been evaluated.
- [ ] Every high-risk feature has evidence of compliance.
- [ ] No unresolved blocker exists.
- [ ] Review account works.
- [ ] Backend works.
- [ ] Payments work.
- [ ] Privacy disclosures match implementation.
- [ ] Metadata matches binary.
- [ ] Legal/IP checks pass.
- [ ] Supported-device tests pass.
- [ ] Final Release build has been tested.

## BLOCK

Block submission if any of these exist:

- [ ] Reviewer cannot access the app.
- [ ] CAPTCHA/OTP/human verification blocks review.
- [ ] Digital purchase uses a payment mechanism that appears to violate 3.1.1 and no documented exception applies.
- [ ] IAP is broken/invisible/unreviewable.
- [ ] Account deletion is missing where required.
- [ ] Privacy declarations are inaccurate.
- [ ] Third-party AI receives personal data without required disclosure/permission.
- [ ] App crashes or has a major blocking bug.
- [ ] Hidden functionality exists.
- [ ] Metadata materially misrepresents the app.
- [ ] Copyright/trademark/licensing rights are missing.
- [ ] Prohibited API/remote-code behavior exists.
- [ ] UGC moderation/report/block systems are missing where required.
- [ ] Required regulatory licensing is missing.
- [ ] Fraudulent/manipulative App Store behavior exists.

---

# 11. OFFICIAL APPLE SOURCES — MUST CHECK BEFORE EACH RELEASE

1. **App Review Guidelines**
   https://developer.apple.com/app-store/review/guidelines/

2. **Apple Developer Agreements and Guidelines**
   https://developer.apple.com/support/terms/

3. **Apple Developer Program License Agreement**
   https://developer.apple.com/support/terms/apple-developer-program-license-agreement/

4. **App Store Connect Help**
   https://developer.apple.com/help/app-store-connect/

5. **Submit an App**
   https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app

6. **App Privacy**
   https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy

7. **Age Rating**
   https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating

8. **Human Interface Guidelines**
   https://developer.apple.com/design/human-interface-guidelines/

9. **Account Deletion**
   https://developer.apple.com/support/offering-account-deletion-in-your-app/

10. **Upcoming Submission Requirements**
    https://developer.apple.com/news/upcoming-requirements/

---

# 12. IMPORTANT ACCOUNT-SAFETY NOTE

Apple's own Developer Program License Agreement contains termination provisions for serious violations, including misleading, fraudulent, improper, unlawful, or dishonest conduct related to the agreement, such as attempting to hide functionality from review, falsifying reviews, or payment fraud.

Therefore:

> **The objective is not to "pass Apple's review." The objective is to build and submit an app that is genuinely compliant.**

A review-specific workaround that hides a violation is not an acceptable solution.

For ambiguous cases, the AI developer should flag:

`REQUIRES APPLE CLARIFICATION`

rather than guessing.

---

# 13. MAINTENANCE POLICY FOR THIS FILE

This document must be treated as a living engineering policy.

Before every production release:

1. Open Apple's official App Review Guidelines.
2. Check the "Last Updated" date.
3. Compare changes against this checklist.
4. Review Apple's latest developer news about guideline changes.
5. Review applicable App Store Connect requirements.
6. Review applicable platform/SDK submission requirements.
7. Update this file if Apple changes a rule.
8. Re-run the compliance audit.

**Do not rely on a cached copy of this document as proof of current Apple policy.**

---

# 14. SCOPE

This checklist comprehensively maps the current numbered **Apple App Review Guidelines** into engineering checks, including the current intentionally omitted guideline numbers.

It does **not** reproduce Apple's legal agreements verbatim. The Apple Developer Program License Agreement, Paid Applications Agreement, entitlement agreements, regional storefront rules, Human Interface Guidelines, platform technical documentation, applicable laws, and App Store Connect requirements can impose additional obligations.

When a specialized Apple technology is used, the AI developer must consult the corresponding current Apple documentation in addition to this checklist.

---

## Final instruction to the AI developer

Before any iOS/iPadOS production deployment:

> **READ THIS FILE → INVENTORY APP FEATURES → MAP APPLICABLE GUIDELINES → AUDIT SOURCE/SDKs → TEST REVIEWER ACCESS → AUDIT PAYMENTS → AUDIT PRIVACY → AUDIT METADATA → AUDIT LEGAL/IP → TEST DEVICES/NETWORKS → GENERATE COMPLIANCE REPORT → ONLY THEN ALLOW SUBMISSION.**

If any material uncertainty remains:

> **BLOCK SUBMISSION AND ESCALATE FOR APPLE CLARIFICATION.**