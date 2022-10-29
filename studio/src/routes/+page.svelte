<script>
  import { onMount } from 'svelte';

  let selectedTab = null;

  let tables = [];
  let tablesLoading = true;

  let rows = [];
  let rowsLoading = false;

  let columns = [];
  let columnsLoading = false;

  const ROW_HEIGHT = 35;

  let viewportHeight;
  let viewportWidth;

  let addRecordMode = false;

  onMount(async () => {
    fetch('http://localhost:8000/api/tables')
      .then((response) => response.json())
      .then(({ data }) => {
        tables = data;
        selectedTab = data[0].name;
        handleTableTabClick(data[0]?.name);
        tablesLoading = false;
      })
      .catch((error) => {
        console.log(error);
        return [];
      });
  });

  function handleTableTabClick(tableName) {
    rowsLoading = true;
    columnsLoading = true;
    selectedTab = tableName;

    addRecordMode = false

    fetch(`http://localhost:8000/api/tables/${tableName}`)
      .then((response) => response.json())
      .then(({ data }) => {
        columns = data;
        columnsLoading = false;
      })
      .catch((error) => {
        console.log(error);
        return [];
      });

    fetch(`http://localhost:8000/api/tables/${tableName}/rows`)
      .then((response) => response.json())
      .then(({ data }) => {
        rows = data.map((row) => {
          let fields = {};
          for (const key in row) {
            fields[key] = {
              value: row[key],
              editable: false,
            };
          }
          return { fields };
        });
        rowsLoading = false;
      })
      .catch((error) => {
        console.log(error);
        return [];
      });
  }

  function handleAddRecord() {
    addRecordMode = true;
    const newRow = {
      fields: {},
      new: true,
    };
    columns.forEach((column) => {
      newRow.fields[column.name] = {
        value: '',
        editable: true,
        placeholder: column.dflt_value || column.notnull === 1 ? '' : 'null',
      };
    });
    rows = [newRow, ...rows];
  }
</script>

<svelte:window bind:innerHeight={viewportHeight} />

<div class="wrapper">
  {#if tablesLoading}
    <p>Loading...</p>
  {:else}
    <ul class="tables">
      <li>
        <button class="soul"> Soul Studio </button>
      </li>
      {#each tables as table}
        <li>
          <button
            class:selected={table.name === selectedTab}
            on:click={handleTableTabClick(table.name)}
          >
            {table.name.replace('_', ' ')}
          </button>
        </li>
      {/each}
    </ul>
    <div class="options">
      <button class="button" on:click={handleAddRecord}> Add record </button>
      {#if addRecordMode}
        <button class="button primary"> Save {rows.reduce((acc, curr) => acc + (curr.new ? 1 : 0), 0)} Changes </button>
        <button class="button transparent"> Discard Change </button>
      {/if}
    </div>
    <div class="table-wrapper">
      <table cellspacing="0">
        <thead>
          <tr>
            <th class="select">
              <input type="checkbox" />
            </th>
            {#each columns as column}
              <th>{column.name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr class:new={row.new} class="table-row">
              <td class="select">
                <input type="checkbox" />
              </td>
              {#each Object.keys(row.fields) as key}
                <td
                  class:editing={row.fields[key].editable}
                  on:dblclick|stopPropagation={() => {
                    row.fields[key].editable = true
                  }}
                >
                  {#if !row.fields[key].editable}
                    <div class="cell">
                      {row.fields[key].value}
                    </div>
                  {:else}
                    <input
                      class="cell"
                      bind:this={row.fields[key].input}
                      bind:value={row.fields[key].value}
                      on:blur={() => {
                        if (row.new) return
                        row.fields[key].editable = false
                      }}
                      placeholder={row.fields[key].placeholder}
                    />
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="phantom">
        {#each new Array(Math.max(Math.floor(viewportHeight / ROW_HEIGHT) - 5, 5)).fill(0) as row}
          <div class="row" />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  ul.tables {
    margin: 0;
    list-style: none;
    padding: 0;
    display: flex;
    background-color: var(--background-1);
    border-bottom: 1px solid var(--divider);
    max-width: 100vw;
    overflow-x: scroll;
  }

  ul.tables li button {
    text-transform: capitalize;
    font-weight: bold;
    font-size: 14px;
    border: none;
    background: none;
    color: var(--text-1);
    padding: 0 2rem;
    height: 35px;
    border-right: 1px solid var(--divider);
    transition: 0.3s all;
  }

  ul.tables li button:hover {
    background: var(--background-3);
  }
  .soul {
    background-color: var(--primary-0) !important;
  }

  ul.tables li button.selected {
    background: var(--background-2);
  }

  .options {
    padding: 1rem;
    display: flex;
  }

  thead {
    background-color: var(--background-2);
  }

  .button {
    border: none;
    background: var(--background-2);
    font-weight: bold;
    padding: 0 1rem;
    height: 30px;
    color: var(--text-1);
    border-radius: 5px;
    margin: 0 0.5rem;
    transition: 0.5s all;
  }

  .button:hover {
    background: var(--background-3);
  }

  .button.primary {
    background: var(--primary-0);
  }

  .button.primary:hover {
    background: var(--primary-1);
  }
  .button.transparent {
    background: none;
    color: var(--text-2);
    margin: 0;
  }
  .button.transparent:hover {
    color: var(--text-3);
  }
  td,
  th {
    min-width: 200px;
    text-align: left;
    font-size: 14px;
    height: 35px;
    margin: 0;
    border-right: 1px solid var(--divider);
    border-bottom: 1px solid var(--divider);
    padding: 0 1rem;
  }
  th {
    padding: 0 1rem;
  }
  td .cell {
    background-color: transparent;
    border: none !important;
    padding: 0 !important;
    color: var(--text-1);
    max-width: 200px;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  td input.cell {
    height: 100%;
  }

  td.editing {
  }
  th {
    border-top: 1px solid var(--divider);
  }
  .new {
    background-color: var(--warning-darker-5);
  }
  .new:hover {
    background-color: var(--warning-darker-5) !important;
  }
  th.select,
  td.select {
    min-width: unset !important;
  }
  .table-row:hover {
    background: var(--background-2);
    transition: 0.3s all;
  }
  .table-wrapper {
    position: relative;
  }

  table {
    z-index: 100;
    position: relative;
  }

  .phantom {
    position: absolute;
    top: 0;
    z-index: 0;
  }

  .phantom .row {
    height: 35px;
    min-width: 100vw;
    border-bottom: 1px solid var(--divider);
  }
  .phantom .row:first-child {
    border-top: 1px solid var(--divider);
    background-color: var(--background-2);
  }
</style>
