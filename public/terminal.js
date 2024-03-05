document.addEventListener('DOMContentLoaded', function() {
    const commandInput = document.getElementById('commandInput');
    const commandOutput = document.getElementById('commandOutput');
  
    commandInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); 
        const command = e.target.value;
        e.target.value = '';
  
        const formData = new FormData();
        formData.append('command', command);
  
        try {
          const response = await fetch('/execute-command', {
            method: 'POST',
            body: formData,
          });
  
          if (response.ok) {
            const contentType = response.headers.get('Content-Type');
            const data = await response.text();
            commandOutput.innerHTML = ''; // Clear the previous output
  
            if (contentType == "text/html") {
              // Output is HTML, insert it directly
              console.log(contentType)
              commandOutput.innerHTML = data;
            } else {
              // Output is plain text, handle line by line
              const files = data.split("\n");
              console.log(files);
              
              const list = document.createElement('ul');
              files.forEach(file => {
                if (file.trim() !== '') {
                  const item = document.createElement('li');
                  item.textContent = file; // Display plain text without linking
                  list.appendChild(item);
                }
              });
              commandOutput.appendChild(list);
            }
          } else {
            console.error('Failed to execute command');
            commandOutput.textContent = 'Error executing command.';
          }
        } catch (error) {
          console.error('Fetch error:', error);
          commandOutput.textContent = 'Fetch error: Unable to connect.';
        }
      }
    });
  });
  