# Cup of Sugar - A Community Care App
A community-driven platform connecting neighbors to share resources, offer help, and build stronger local communities.

## 📋 Project Overview

Cup of Sugar enables users to connect with people in their local community to offer or request help across various categories including childcare, pet care, household tasks, financial assistance, food, and goods. Think of it as an elevated "Buy Nothing" group that builds community connections while helping neighbors meet their needs.
Made as a group final project for CS-546



## Running the Application

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/rayruzzo/CS-546-Group-3-Project.git
cd CS-546-Group-3-Project

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start the development server
npm run dev

# Seeding the DB
There is a script to run the seeding script at startup in app.js but you can run this as well
```
npm run seed
```

The app will be available at [http://localhost:3000](http://localhost:3000) by default.
## 👤 Test Accounts & Important 
Notes

The database is seeded with several test accounts for development and testing. All accounts use the same password:

**Password for all accounts:** `Password123!`

### Admin Account
- **Email:** `nick.fury@shield.gov`

### Moderator Account
- **Email:** `maria.hill@shield.gov`

### Regular User Accounts
- **Email:** `steve.rogers@avengers.com`
- **Email:** `kamala.khan@gmail.com`
- **Email:** `carol.danvers@usaf.mil`
- **Email:** `jennifer.walters@law.com`
- **Email:** `matt.murdock@nelsonmurdock.com` 
- **Email:** `peter.parker@empire.edu` 

All accounts above use the same password: `Password123!`


```

### Environment Variables

Create a `.env` file in the root directory with the following:

```
PORT=3000
MONGODB_URI='mongodb://localhost:27017/'
MONGODB_DATABASE='group_3_cs546'
NODE_ENV=development
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: Express-Session
- **Frontend**: Handlebars


## 🔄 Git Workflow & Best Practices

### Branch Naming Convention

Use descriptive branch names that follow this pattern:
- `feature/description` - For new features
- `bugfix/description` - For bug fixes
- `hotfix/description` - For urgent production fixes
- `refactor/description` - For code refactoring
- `docs/description` - For documentation updates

**Examples:**
- `feature/user-authentication`
- `bugfix/fix-post-deletion`
- `refactor/optimize-feed-query`

### Workflow Rules

1. **Never commit directly to `main`**
   - The `main` branch should always contain production-ready code
   - All changes must go through pull requests

2. **Always work on a feature branch**
   ```bash
   # Create and switch to a new branch
   git checkout -b feature/your-feature-name
   ```

3. **Keep your branch up to date**
   ```bash
   # Regularly sync with main
   git checkout main
   git pull origin main
   git checkout feature/your-feature-name
   git merge main
   ```

4. **Commit message guidelines**
   - Use clear, descriptive commit messages
   - Start with a verb in present tense
   - Keep the first line under 50 characters
   - Add detailed description if needed
   
   **Examples:**
   ```
   Add user authentication middleware
   Fix post filtering by category
   Refactor database connection logic
   Update README with setup instructions
   ```

5. **Pull Request Process**
   - Create a PR when your feature is complete
   - Write a clear PR description explaining what was changed and why
   - Reference any related issues (e.g., "Closes #123")
   - Request at least one team member to review
   - Address all review comments before merging
   - Ensure all tests pass and there are no merge conflicts

6. **Code Review Guidelines**
   - Review PRs promptly (within 24 hours)
   - Be constructive and respectful in feedback
   - Check for:
     - Code quality and readability
     - Proper error handling
     - Security vulnerabilities
     - Test coverage
     - Documentation updates

7. **Before Merging**
   - ✅ All tests pass
   - ✅ Code has been reviewed and approved
   - ✅ No merge conflicts
   - ✅ Branch is up to date with `main`
   - ✅ Documentation is updated if needed

8. **Merge Strategy**
   - Use "Squash and Merge" for feature branches to keep history clean
   - Delete branch after merging

### Team Communication

- Use GitHub Issues to track bugs and feature requests
- Use GitHub Projects for sprint planning and task management
- Tag team members in PR comments when their input is needed
- Keep discussions in GitHub to maintain context

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- Ray R.
- Gabriel E.
- Nick R.
- Cynthia P.

## 🤝 Support

For questions or issues, please create an issue in the GitHub repository or contact the team leads.
