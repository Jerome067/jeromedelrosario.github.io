// Load data from JSON file
let portfolioData = {};

fetch('data.json')
    .then(response => response.json())
    .then(data => {
        portfolioData = data;
        populatePortfolio();
    })
    .catch(error => console.error('Error loading data:', error));

// Populate Portfolio with Data
function populatePortfolio() {
    // Hero Section
    document.getElementById('heroName').textContent = portfolioData.personal.name;
    document.getElementById('heroTitle').textContent = portfolioData.personal.title;
    document.getElementById('heroSubtitle').textContent = portfolioData.personal.subtitle;

    // About Section
    document.getElementById('aboutTitle').textContent = portfolioData.about.title;
    document.getElementById('aboutDescription').textContent = portfolioData.about.description;
    document.getElementById('aboutExtra').textContent = portfolioData.about.extra;

    // Skills Section
    const skillsContainer = document.getElementById('skillsContainer');
    skillsContainer.innerHTML = '';
    portfolioData.skills.forEach(skillCategory => {
        const skillCard = document.createElement('div');
        skillCard.className = 'skill-card';
        
        let skillsHTML = `<h3>${skillCategory.category}</h3><div class="skills-list">`;
        skillCategory.items.forEach(item => {
            skillsHTML += `<div class="skill-item">${item}</div>`;
        });
        skillsHTML += `</div>`;
        
        skillCard.innerHTML = skillsHTML;
        skillsContainer.appendChild(skillCard);
    });

    // Soft Skills Section
    const softSkillsContainer = document.getElementById('softSkillsContainer');
    if (softSkillsContainer && portfolioData.softSkills) {
        softSkillsContainer.innerHTML = '';
        portfolioData.softSkills.forEach(skill => {
            const skillCard = document.createElement('div');
            skillCard.className = 'soft-skill-card';
            skillCard.innerHTML = `<span>${skill.title}</span>`;
            softSkillsContainer.appendChild(skillCard);
        });
    }

    // Education Section
    const educationContainer = document.getElementById('educationContainer');
    educationContainer.innerHTML = '';
    portfolioData.education.forEach(edu => {
        const eduCard = document.createElement('div');
        eduCard.className = 'education-card';
        eduCard.innerHTML = `
            <h3>${edu.degree}</h3>
            <p class="school-name">${edu.school}</p>
            <p class="program">${edu.program}</p>
            <p class="year">${edu.year}</p>
            <div class="education-hover">
                <div class="hover-content">
                    <h4>${edu.school}</h4>
                    <p>${edu.description}</p>
                </div>
            </div>
        `;
        educationContainer.appendChild(eduCard);
    });

    // Projects Section
    const projectsContainer = document.getElementById('projectsContainer');
    projectsContainer.innerHTML = '';
    portfolioData.projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        const tagsHTML = project.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        projectCard.innerHTML = `
            <div class="project-image">${project.emoji}</div>
            <div class="project-content">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="project-tags">
                    ${tagsHTML}
                </div>
            </div>
        `;
        projectsContainer.appendChild(projectCard);
    });

    // Mini Projects Section
    const miniProjectsContainer = document.getElementById('miniProjectsContainer');
    miniProjectsContainer.innerHTML = '';
    portfolioData.miniProjects.forEach((miniProject, index) => {
        const miniCard = document.createElement('div');
        miniCard.className = 'mini-project-card';
        miniCard.innerHTML = `
            <div class="mini-project-header" onclick="toggleMiniProject(${index})">
                <span class="mini-project-emoji">${miniProject.emoji}</span>
                <h3>${miniProject.title}</h3>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="mini-project-content hidden" id="mini-project-${index}">
                <p class="mini-project-description">${miniProject.description}</p>
                <div class="variations">
                    <h4>Variations:</h4>
                    <div class="variations-list">
                        ${miniProject.variations.map((v, vIndex) => `
                            <div class="variation-item" onclick="toggleVariation(${index}, ${vIndex}, event)">
                                <span class="variation-name">${v.language}</span>
                                <span class="variation-arrow">→</span>
                                <div class="variation-expanded hidden" id="variation-${index}-${vIndex}">
                                    <a href="${v.link}" target="_blank" class="open-btn">Open</a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        miniProjectsContainer.appendChild(miniCard);
    });
}

    // Certificates Section
    const certificatesContainer = document.getElementById('certificatesContainer');
    certificatesContainer.innerHTML = '';
    portfolioData.certificates.forEach(cert => {
        const certCard = document.createElement('div');
        certCard.className = 'certificate-card';
        certCard.innerHTML = `
            <h3>🏆 ${cert.title}</h3>
            <p>${cert.provider}</p>
            <p class="cert-date">${cert.status}</p>
        `;
        certificatesContainer.appendChild(certCard);
    });

    // Languages Section
    const languagesContainer = document.getElementById('languagesContainer');
    languagesContainer.innerHTML = '';
    portfolioData.languages.forEach(lang => {
        const langCard = document.createElement('div');
        langCard.className = 'language-card';
        langCard.innerHTML = `
            <h3>${lang.language}</h3>
            <p class="proficiency">${lang.proficiency}</p>
        `;
        languagesContainer.appendChild(langCard);
    });

    // Involvement Section
    const involvementContainer = document.getElementById('involvementContainer');
    involvementContainer.innerHTML = '';
    portfolioData.involvement.forEach(inv => {
        const invCard = document.createElement('div');
        invCard.className = 'involvement-card';
        invCard.innerHTML = `
            <h3>${inv.position}</h3>
            <p class="organization">${inv.organization}</p>
            <p class="year">${inv.year}</p>
        `;
        involvementContainer.appendChild(invCard);
    });

    // Contact Section
    document.getElementById('contactEmail').textContent = portfolioData.personal.email;
    document.getElementById('contactPhone').textContent = portfolioData.personal.phone;
    document.getElementById('contactLocation').textContent = portfolioData.personal.location;
    const linkedinLink = document.getElementById('contactLinkedin');
    linkedinLink.textContent = portfolioData.personal.github.replace('github.com/', 'linkedin.com/in/');
    linkedinLink.href = 'https://linkedin.com/in/lenjmagsino';
}

// Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Load dark mode preference on page load
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// Smooth Scroll Navigation
function scrollTo(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Form Submit Handler
function handleSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    
    // Simple validation
    if (name.trim() === '' || email.trim() === '' || message.trim() === '') {
        alert('Please fill in all fields');
        return;
    }
    
    // Show success message
    alert('Thank you for your message, ' + name + '! I will get back to you soon.');
    
    // Reset form
    event.target.reset();
}

// Mini Projects Toggle Functions
function toggleMiniProject(index) {
    const content = document.getElementById(`mini-project-${index}`);
    const icon = event.target.closest('.mini-project-header').querySelector('.toggle-icon');
    
    content.classList.toggle('hidden');
    icon.classList.toggle('open');
}

function toggleVariation(projectIndex, variationIndex, event) {
    event.stopPropagation();
    const expanded = document.getElementById(`variation-${projectIndex}-${variationIndex}`);
    const arrow = event.currentTarget.querySelector('.variation-arrow');
    
    expanded.classList.toggle('hidden');
    arrow.classList.toggle('open');
}
