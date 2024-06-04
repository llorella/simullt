function scrollToBottom(element) {
  element.scrollTop = element.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function() {
  const commandInput = document.getElementById('commandInput');
  const commandOutput = document.getElementById('commandOutput');
  const runCommand = document.getElementById('runCommand');
  const rejectCommand = document.getElementById('rejectCommand');
  const commandOptions = document.getElementById('commandOptions');
  const simulatorOutput = document.getElementById('simulatorOutput');

  commandInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = e.target.value;
      e.target.value = '';
      commandOutput.innerHTML = 'initialzing llt simulator..';
      simulatorOutput.innerHTML = '';
      const formData = new FormData();
      formData.append('query', query);
      
      fetch('/ll', {
        method: 'POST',
        body: formData,
      })
      .then(response => response.text())
      .then(content => {
        commandOutput.innerHTML = content;
        commandOptions.style.display = 'block'; // Show run/reject options
      })
      .catch(error => {
        console.error('Fetch error:', error);
        commandOutput.textContent = 'Fetch error: Unable to connect.';
      });
    }
  });

  runCommand.addEventListener('click', () => {
    const commandOutput = document.getElementById('commandOutput');
    const eventSource = new EventSource('/simullt', {
      method: 'POST',
      body: JSON.stringify({ command: commandOutput.textContent }),
    });
    eventSource.onmessage = function (event) {
      const data = JSON.parse(event.data);
      const content = data.choices[0].delta.content;
      if (content !== undefined) {
        simulatorOutput.innerHTML += content;
        scrollToBottom(simulatorOutput);
      } else {
        //simulatorOutput.innerHTML += '\n';
        //streams may return undefined in middle of stream, so this could be wrong and comment above is better
        eventSource.close();
        commandOptions.style.display = 'none'; // Hide options after running
      }
      scrollToBottom(simulatorOutput);
    };
    eventSource.onerror = function (error) {
      console.error('EventSource error:', error);
      eventSource.close();
      simulatorOutput.textContent = 'Stream error: Unable to continue receiving data.';
      commandOptions.style.display = 'none'; // Hide options after error
    };
  });

  rejectCommand.addEventListener('click', () => {
    const formData = new FormData();
    formData.append('command', commandOutput.textContent);
    formData.append('feedback', 'reject'); 
    fetch('/reject', {
      method: 'POST',
      body: formData,
    }).then(response => response.text())
    .then(content => {
      simulatorOutput.innerHTML = content;
      commandOptions.style.display = 'none'; // Hide options after rejecting
    })
    .catch(error => {
      console.error('Fetch error:', error);
      simulatorOutput.textContent = 'Fetch error: Unable to connect.';
    });
  });
});