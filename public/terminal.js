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
            const data = await response.text();
            const files = data.split("\n");
            console.log(files)
            commandOutput.innerHTML = ''; 
            const list = document.createElement('ul');
            files.forEach(file => {
              const item = document.createElement('li');
              const link = document.createElement('a');
              link.href = `${file}`; // projects is magic value change later
              link.textContent = file;
              item.appendChild(link);
              list.appendChild(item);
            });
            commandOutput.appendChild(list);
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
  