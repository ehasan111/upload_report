const fs = require('fs');
const path = require('path');
const readline = require('readline');

const baseDir = './reports';
const dataFile = './data.json';
const categories = ['api', 'web', 'mobile', 'security', 'performance', 'ui-ux', 'misc'];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

function getUniqueProjects(data) {
    const projects = new Set();
    data.forEach(item => {
        if (item.projectName && item.projectName !== '-') {
            projects.add(item.projectName);
        }
    });
    return Array.from(projects).sort();
}

function getProjectDocs(projectName, data) {
    // Find any existing entry with this project and get its docs
    const existingProject = data.find(item => item.projectName === projectName);
    return existingProject ? existingProject.docs : '-';
}

function displayProjectList(projects) {
    console.log('\n=== Available Projects ===');
    projects.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project}`);
    });
    console.log(`  ${projects.length + 1}. [Unlisted] (Add new project)`);
}

async function selectProject(projects, existingData) {
    while (true) {
        displayProjectList(projects);
        const choice = await askQuestion('\nSelect project number: ');
        const choiceNum = parseInt(choice);
        
        if (choiceNum > 0 && choiceNum <= projects.length) {
            // Existing project - GET docs from existing data, DON'T ASK
            const selectedProject = projects[choiceNum - 1];
            const existingDocs = getProjectDocs(selectedProject, existingData);
            return { 
                projectName: selectedProject, 
                docs: existingDocs,
                isNew: false 
            };
        } else if (choiceNum === projects.length + 1) {
            // New project - ASK for docs once
            const newProject = await askQuestion('Enter new project name: ');
            if (newProject.trim()) {
                console.log('\n✓ New project created!');
                
                // ASK FOR DOCS ONLY FOR NEW PROJECT
                const docs = await askDocsForProject();
                
                return { 
                    projectName: newProject.trim(), 
                    docs: docs,
                    isNew: true 
                };
            } else {
                console.log('Project name cannot be empty!');
            }
        } else {
            console.log('Invalid selection. Please try again.');
        }
    }
}

async function askDocsForProject() {
    const response = await askQuestion('Add docs link for this project? (y/n): ');
    if (response.toLowerCase() === 'y') {
        const docsLink = await askQuestion('Enter docs URL/link: ');
        return docsLink.trim() || '-';
    }
    return '-';
}

async function updateList() {
    let existingData = [];
    if (fs.existsSync(dataFile)) {
        existingData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }

    const existingPaths = existingData.map(item => item.filePath);
    const uniqueProjects = getUniqueProjects(existingData);
    let newEntriesAdded = false;

    for (const category of categories) {
        const categoryDir = path.join(baseDir, category);
        
        if (fs.existsSync(categoryDir)) {
            const files = fs.readdirSync(categoryDir);

            for (const file of files) {
                if (file.endsWith('.html')) {
                    const filePath = `${category}/${file}`;
                    
                    if (!existingPaths.includes(filePath)) {
                        console.log(`\n========== New File Found! ==========`);
                        console.log(`Category: [${category.toUpperCase()}]`);
                        console.log(`File: ${file}`);
                        
                        const projectSelection = await selectProject(uniqueProjects, existingData);
                        const projectName = projectSelection.projectName;
                        const projectDocs = projectSelection.docs || '-';
                        
                        const comment = await askQuestion('Enter Comment (press Enter to skip): ');

                        const displayName = file.replace('.html', '').replace(/[-_]/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());

                        existingData.push({
                            category: category,
                            projectName: projectName,
                            name: displayName,
                            filePath: filePath,
                            time: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }),
                            docs: projectDocs,
                            comment: comment || '-'
                        });
                        newEntriesAdded = true;
                        console.log('✓ Report added successfully!\n');
                    }
                }
            }
        }
    }

    if (newEntriesAdded) {
        fs.writeFileSync(dataFile, JSON.stringify(existingData, null, 4));
        console.log("\n✓ data.json has been successfully updated!");
        console.log("✓ Open index.html in your browser to view the dashboard.");
        printSummaryTable(existingData);
    } else {
        console.log("\nNo new reports were found.");
        printSummaryTable(existingData);
    }
    
    rl.close();
}

function printSummaryTable(data) {
    if (!data.length) return;
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    REPORT DASHBOARD SUMMARY                 ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    const catCount = {};
    data.forEach(r => {
        catCount[r.category] = (catCount[r.category] || 0) + 1;
    });

    console.log(`║  Total Reports : ${String(data.length).padEnd(44)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Category Breakdown:                                         ║');
    Object.entries(catCount).forEach(([cat, count]) => {
        const line = `    [${cat.toUpperCase()}]  ${count} report(s)`;
        console.log(`║  ${line.padEnd(61)}║`);
    });
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Latest 5 Reports:                                           ║');
    const latest = [...data].slice(-5).reverse();
    latest.forEach(r => {
        const line = `    • ${r.name} (${r.category}) — ${r.time}`;
        const trimmed = line.length > 60 ? line.slice(0, 57) + '...' : line;
        console.log(`║  ${trimmed.padEnd(61)}║`);
    });
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

updateList();
