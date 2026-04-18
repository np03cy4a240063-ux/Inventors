# ReInvent Project - Daily Stand-Up Report

## 1. Version 1 (v1) Review & Problems
During our review of the initial v1 build, we identified several critical issues that needed to be addressed to make the project production-ready:
- **Design Inconsistencies:** The UI was heavily basic and failed to meet the high-fidelity design standards required for a professional SaaS product.
- **Hardcoded Legacy Data:** Personal names (like "Rekha Bhujel" and "Apekshya Pandeya") were hardcoded directly into the live text of the splash page.
- **Missing Authentication:** There was absolutely no system in place for users to create accounts, log in, or recover passwords.
- **Architecture Flaws:** The project was monolithic and lacked a clean separation between the frontend interface and backend logic.
- **Layout Limitations:** The CSS was disorganized and lacked a rigid grid system, causing alignment issues on different screen sizes.

---

## 2. Version 2 (v2) Additions & Solutions
For v2, we executed a massive overhaul, transforming the project into a secure, pixel-perfect application. Here is what we successfully added:

- **Complete UI Overhaul:** Restructured the entire splash page (`index.html`) using a precise 35/65 split-column master grid, exactly matching the reference designs pixel-by-pixel.
- **Full Authentication Suite:** Created brand new, visually stunning Login (`login.html`) and Sign Up (`signup.html`) pages featuring complex geometric layouts, rounded cards, and split-screen designs.
- **Forgot Password Flow:** Designed and implemented a highly-detailed `forgot_password.html` page utilizing advanced CSS layering and inverted background techniques (`forget.jpg`) to mirror the provided mockups.
- **Backend Integration:** Built a robust Node.js/Express backend server connected to a customized MySQL database (`db.sql`). This completely manages user registration and secure login queries via Bcrypt password hashing.
- **Modular Architecture:** Organized the entire codebase cleanly into three distinct environments: `frontend/`, `backend/`, and a unified `integrated/` folder that is fully prepped for production deployment.

---

## 3. Team Contribution Breakdown
The workload was distributed efficiently among our 4-person team. While the effort was shared, the structural and integration complexities required slightly heavier lifting from the system leads.

### Sugam (~30% Contribution) - Core Backend & Integration Lead
- Designed and documented the MySQL database schema structure.
- Developed the Node.js/Express backend application from scratch.
- Implemented robust Bcrypt routing for secure password handling.
- Spearheaded the merging of the frontend and backend into the final `integrated` release folder.

### Rekha (~30% Contribution) - QA, Layout Architect & Documentation Lead
- Engineered the complex CSS flex/grid layout architectures for the Splash and Forgot Password pages.
- Managed the exact placement, border sizing, and background inversion logic for all images.
- Conducted rigorous UI/UX debugging to guarantee a 1:1 pixel-perfect match with the client's design references.
- Authored all core developer documentation, including the main v2 README and this Daily Stand-Up report.

### Apekshya (~20% Contribution) - Frontend UI Specialist
- Refactored the original v1 Splash Page, successfully removing all hardcoded legacy names and cleaning the DOM.
- Built the foundational HTML/CSS structural models for the new authentication environments.
- Managed global CSS variables to ensure brand colors, fonts, and icon rendering remained completely unified across all pages.

### Danny (~20% Contribution) - Frontend Features Specialist 
- Implemented the intricate design details specifically on the dual-pane Sign Up and Login cards.
- Programmed all client-side form validations, input requirements, and warning labels.
- Managed the responsive media-query breakpoints to ensure the application scales gracefully on smaller screens.
